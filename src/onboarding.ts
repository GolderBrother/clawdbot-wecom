import type { ClawdbotConfig } from "openclaw/plugin-sdk";
import type { WecomConfig } from "./types.js";
import { probeWecom } from "./probe.js";

export const wecomOnboardingAdapter = async (params: {
  cfg: ClawdbotConfig;
}): Promise<{
  configured: boolean;
  nextConfig?: ClawdbotConfig;
  error?: string;
}> => {
  const { cfg } = params;
  const wecomCfg = cfg.channels?.wecom as WecomConfig | undefined;

  if (!wecomCfg) {
    return {
      configured: false,
      error: "WeChat Work channel configuration not found",
    };
  }

  // Check if credentials are configured
  if (!wecomCfg.corpId || !wecomCfg.corpSecret || !wecomCfg.agentId) {
    return {
      configured: false,
      error: "WeChat Work credentials incomplete (corpId, corpSecret, agentId required)",
    };
  }

  // Probe connection
  const probeResult = await probeWecom(wecomCfg);
  if (!probeResult.ok) {
    return {
      configured: false,
      error: probeResult.error,
    };
  }

  return {
    configured: true,
  };
};
