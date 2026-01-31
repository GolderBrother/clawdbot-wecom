import type { WecomConfig } from "./types.js";
import { DEFAULT_ACCOUNT_ID } from "openclaw/plugin-sdk";

export function resolveWecomCredentials(cfg: WecomConfig | undefined): {
  corpId?: string;
  corpSecret?: string;
  agentId?: number;
  token?: string;
  encodingAESKey?: string;
} | null {
  if (!cfg) return null;

  const corpId = cfg.corpId?.trim();
  const corpSecret = cfg.corpSecret?.trim();
  const agentId = typeof cfg.agentId === "string" ? parseInt(cfg.agentId, 10) : cfg.agentId;
  const token = cfg.token?.trim();
  const encodingAESKey = cfg.encodingAESKey?.trim();

  if (!corpId || !corpSecret || !agentId) {
    return null;
  }

  return {
    corpId,
    corpSecret,
    agentId,
    token,
    encodingAESKey,
  };
}

export function resolveWecomAccount(params: {
  cfg: { channels?: { wecom?: WecomConfig } };
}): {
  accountId: string;
  enabled: boolean;
  configured: boolean;
  corpId?: string;
  agentId?: string;
} {
  const wecomCfg = params.cfg.channels?.wecom;
  const enabled = wecomCfg?.enabled ?? false;
  const creds = resolveWecomCredentials(wecomCfg);

  return {
    accountId: DEFAULT_ACCOUNT_ID,
    enabled,
    configured: !!creds,
    corpId: creds?.corpId,
    agentId: creds?.agentId?.toString(),
  };
}
