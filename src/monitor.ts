import type { ClawdbotConfig, RuntimeEnv, HistoryEntry } from "openclaw/plugin-sdk";
import type { WecomConfig, WecomMessageEvent } from "./types.js";
import {
  buildPendingHistoryContextFromMap,
  recordPendingHistoryEntryIfEnabled,
  clearHistoryEntriesIfEnabled,
  DEFAULT_GROUP_HISTORY_LIMIT,
} from "openclaw/plugin-sdk";
import { verifySignature, decryptMessage, generateRandomString } from "./crypto.js";
import { resolveWecomCredentials } from "./accounts.js";
import { handleWecomMessage } from "./bot.js";

export type MonitorWecomOpts = {
  config?: ClawdbotConfig;
  runtime?: RuntimeEnv;
  abortSignal?: AbortSignal;
  accountId?: string;
};

let httpServer: any = null;
let botOpenId: string | undefined;

async function fetchBotOpenId(cfg: WecomConfig): Promise<string | undefined> {
  try {
    const { probeWecom } = await import("./probe.js");
    const result = await probeWecom(cfg);
    return result.ok ? result.corpId : undefined;
  } catch {
    return undefined;
  }
}

export async function monitorWecomProvider(opts: MonitorWecomOpts = {}): Promise<void> {
  const cfg = opts.config;
  if (!cfg) {
    throw new Error("Config is required for WeChat Work monitor");
  }

  const wecomCfg = cfg.channels?.wecom as WecomConfig | undefined;
  const creds = resolveWecomCredentials(wecomCfg);
  if (!creds) {
    throw new Error("WeChat Work credentials not configured");
  }

  const log = opts.runtime?.log ?? console.log;
  const error = opts.runtime?.error ?? console.error;

  if (wecomCfg) {
    botOpenId = creds.corpId;
    log(`wecom: bot corp_id resolved: ${botOpenId}`);
  }

  const port = wecomCfg?.webhookPort ?? 3000;

  // Create HTTP server
  const express = (await import("express")).default;
  const bodyParser = (await import("body-parser")).default;
  const xml2js = (await import("xml2js")).default;

  const app = express();

  // Verify callback URL (GET request)
  app.get(wecomCfg?.webhookPath ?? "/wecom/events", (req, res) => {
    const { msg_signature, timestamp, nonce, echostr } = req.query as any;

    if (!msg_signature || !timestamp || !nonce) {
      return res.status(400).send("Missing signature parameters");
    }

    const isValid = verifySignature(
      creds.token ?? "",
      timestamp,
      nonce,
      msg_signature
    );

    if (!isValid) {
      log("wecom: invalid signature, rejecting callback verification");
      return res.status(403).send("Invalid signature");
    }

    log("wecom: callback URL verified successfully");
    res.send(echostr);
  });

  // Receive messages (POST request)
  app.post(
    wecomCfg?.webhookPath ?? "/wecom/events",
    bodyParser.text({ type: "text/xml" }),
    async (req, res) => {
      try {
        const xmlData = req.body;

        // Parse XML to JSON
        const result = await xml2js.parseStringPromise(xmlData);
        const message = result.xml as unknown as WecomMessageEvent;

        // Decrypt message if encryption is enabled
        let messageToProcess = message;
        if (message.Encrypt && message.Encrypt.Content) {
          if (!creds.encodingAESKey) {
            log("wecom: received encrypted message but no AES key configured");
            return res.send("success");
          }

          const nonce = message.Encrypt.Nonce;
          const ciphertext = message.Encrypt.Content;
          const msgSignature = message.Encrypt.MsgSignature;

          // Decrypt message
          const decryptedContent = decryptMessage(
            creds.encodingAESKey!,
            nonce!,
            ciphertext!
          );

          // Parse decrypted XML
          const decryptedResult = await xml2js.parseStringPromise(decryptedContent);
          messageToProcess = decryptedResult.xml as unknown as WecomMessageEvent;
        }

        // Handle message
        await handleWecomMessage({
          cfg,
          event: messageToProcess,
          botOpenId,
          runtime: opts.runtime,
        });

        res.send("success");
      } catch (err) {
        error(`wecom: error handling message event: ${String(err)}`);
        res.send("success");
      }
    }
  );

  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      if (httpServer) {
        httpServer.close(() => {
          log("wecom: HTTP server stopped");
        });
        httpServer = null;
      }
    };

    const handleAbort = () => {
      log("wecom: abort signal received, stopping HTTP server");
      cleanup();
      resolve();
    };

    if (opts.abortSignal?.aborted) {
      cleanup();
      resolve();
      return;
    }

    opts.abortSignal?.addEventListener("abort", handleAbort, { once: true });

    try {
      httpServer = app.listen(port, () => {
        log(`wecom: HTTP server listening on port ${port}`);
      });
    } catch (err) {
      cleanup();
      opts.abortSignal?.removeEventListener("abort", handleAbort);
      reject(err);
    }
  });
}

export function stopWecomMonitor(): void {
  if (httpServer) {
    httpServer.close(() => {
      console.log("WeChat Work HTTP server stopped");
    });
    httpServer = null;
  }
}
