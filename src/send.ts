import type { ClawdbotConfig } from "openclaw/plugin-sdk";
import type { WecomConfig, WecomSendResult } from "./types.js";
import { resolveWecomCredentials } from "./accounts.js";
import { sendAppMessage, uploadMedia } from "./client.js";

export async function sendMessageWecom(params: {
  cfg: ClawdbotConfig;
  to: string;
  text: string;
}): Promise<WecomSendResult> {
  const { cfg, to, text } = params;
  const wecomCfg = cfg.channels?.wecom as WecomConfig | undefined;
  if (!wecomCfg) {
    throw new Error("WeChat Work channel not configured");
  }

  const creds = resolveWecomCredentials(wecomCfg);
  if (!creds) {
    throw new Error("WeChat Work credentials not configured");
  }

  // Send app message
  const message = {
    touser: to,
    agentid: creds.agentId!,
    msgtype: "text",
    text: {
      content: text,
    },
  };

  const response = await sendAppMessage(wecomCfg, message);

  if (response.errcode !== 0) {
    throw new Error(`WeChat Work send failed: ${response.errmsg}`);
  }

  return {
    messageId: response.invaliduser || "unknown",
    chatId: to,
  };
}

export async function sendMarkdownWecom(params: {
  cfg: ClawdbotConfig;
  to: string;
  text: string;
}): Promise<WecomSendResult> {
  // WeChat Work doesn't support markdown cards like Feishu
  // Fallback to plain text
  return sendMessageWecom({
    cfg: params.cfg,
    to: params.to,
    text: params.text,
  });
}

export async function sendImageWecom(params: {
  cfg: ClawdbotConfig;
  to: string;
  imageKey: string;
}): Promise<WecomSendResult> {
  const { cfg, to, imageKey } = params;
  const wecomCfg = cfg.channels?.wecom as WecomConfig | undefined;
  if (!wecomCfg) {
    throw new Error("WeChat Work channel not configured");
  }

  const creds = resolveWecomCredentials(wecomCfg);
  if (!creds) {
    throw new Error("WeChat Work credentials not configured");
  }

  const message = {
    touser: to,
    agentid: creds.agentId!,
    msgtype: "image",
    image: {
      media_id: imageKey,
    },
  };

  const response = await sendAppMessage(wecomCfg, message);

  if (response.errcode !== 0) {
    throw new Error(`WeChat Work image send failed: ${response.errmsg}`);
  }

  return {
    messageId: response.invaliduser || "unknown",
    chatId: to,
  };
}

export async function sendFileWecom(params: {
  cfg: ClawdbotConfig;
  to: string;
  fileKey: string;
}): Promise<WecomSendResult> {
  const { cfg, to, fileKey } = params;
  const wecomCfg = cfg.channels?.wecom as WecomConfig | undefined;
  if (!wecomCfg) {
    throw new Error("WeChat Work channel not configured");
  }

  const creds = resolveWecomCredentials(wecomCfg);
  if (!creds) {
    throw new Error("WeChat Work credentials not configured");
  }

  const message = {
    touser: to,
    agentid: creds.agentId!,
    msgtype: "file",
    file: {
      media_id: fileKey,
    },
  };

  const response = await sendAppMessage(wecomCfg, message);

  if (response.errcode !== 0) {
    throw new Error(`WeChat Work file send failed: ${response.errmsg}`);
  }

  return {
    messageId: response.invaliduser || "unknown",
    chatId: to,
  };
}
