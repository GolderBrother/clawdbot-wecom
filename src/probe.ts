import type { ClawdbotConfig } from "openclaw/plugin-sdk";
import type { WecomConfig, WecomProbeResult } from "./types.js";
import { resolveWecomCredentials } from "./accounts.js";
import { getWecomAccessToken } from "./client.js";

export async function probeWecom(
  cfg: WecomConfig | undefined
): Promise<WecomProbeResult> {
  if (!cfg) {
    return {
      ok: false,
      error: "WeChat Work channel not configured",
    };
  }

  const creds = resolveWecomCredentials(cfg);
  if (!creds) {
    return {
      ok: false,
      error: "WeChat Work credentials not configured (corpId, corpSecret, agentId required)",
    };
  }

  try {
    // Try to get access token to verify credentials
    await getWecomAccessToken(creds.corpId!, creds.corpSecret!);

    return {
      ok: true,
      corpId: creds.corpId,
      agentId: creds.agentId?.toString(),
    };
  } catch (error) {
    const err = error as Error;
    return {
      ok: false,
      error: `WeChat Work connection failed: ${err.message}`,
      corpId: creds.corpId,
      agentId: creds.agentId?.toString(),
    };
  }
}
