import type { ChannelPlugin, ClawdbotConfig } from "openclaw/plugin-sdk";
import { DEFAULT_ACCOUNT_ID } from "openclaw/plugin-sdk";
import type { ResolvedWecomAccount, WecomConfig } from "./types.js";
import { resolveWecomAccount, resolveWecomCredentials } from "./accounts.js";
import { wecomOutbound } from "./outbound.js";
import { probeWecom } from "./probe.js";
import { resolveWecomGroupToolPolicy } from "./policy.js";
import { normalizeWecomTarget, looksLikeWecomId } from "./targets.js";
import { sendMessageWecom } from "./send.js";
import {
  listWecomDirectoryPeers,
  listWecomDirectoryGroups,
  listWecomDirectoryPeersLive,
  listWecomDirectoryGroupsLive,
} from "./directory.js";
import { wecomOnboardingAdapter } from "./onboarding.js";

const meta = {
  id: "wecom",
  label: "WeChat Work",
  selectionLabel: "WeChat Work (企业微信)",
  docsPath: "/channels/wecom",
  docsLabel: "wecom",
  blurb: "企业微信 enterprise messaging.",
  aliases: ["wxwork"],
  order: 80,
} as const;

export const wecomPlugin: ChannelPlugin<ResolvedWecomAccount> = {
  id: "wecom",
  meta: {
    ...meta,
  },
  pairing: {
    idLabel: "wecomUserId",
    normalizeAllowEntry: (entry) => entry.replace(/^(wecom|user):/i, ""),
    notifyApproval: async ({ cfg, id }) => {
      await sendMessageWecom({
        cfg,
        to: id,
        text: "您已被批准使用 AI 助手。",
      });
    },
  },
  capabilities: {
    chatTypes: ["direct", "channel"],
    polls: false,
    threads: false, // WeChat Work doesn't support threads
    media: true,
    reactions: false, // WeChat Work doesn't support reactions
    edit: false, // WeChat Work doesn't support editing messages
    reply: true,
  },
  agentPrompt: {
    messageToolHints: () => [
      "- WeChat Work targeting: omit `target` to reply to current conversation.",
      "- WeChat Work supports text and media messages.",
    ],
  },
  groups: {
    resolveToolPolicy: resolveWecomGroupToolPolicy,
  },
  reload: { configPrefixes: ["channels.wecom"] },
  configSchema: {
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        enabled: { type: "boolean" },
        corpId: { type: "string" },
        corpSecret: { type: "string" },
        agentId: { type: "string" },
        token: { type: "string" },
        encodingAESKey: { type: "string" },
        webhookPath: { type: "string" },
        webhookPort: { type: "integer", minimum: 1 },
        dmPolicy: { type: "string", enum: ["open", "pairing", "allowlist"] },
        allowFrom: { type: "array", items: { oneOf: [{ type: "string" }, { type: "number" }] } },
        groupPolicy: { type: "string", enum: ["open", "allowlist", "disabled"] },
        groupAllowFrom: { type: "array", items: { oneOf: [{ type: "string" }, { type: "number" }] } },
        requireMention: { type: "boolean" },
        historyLimit: { type: "integer", minimum: 0 },
        dmHistoryLimit: { type: "integer", minimum: 0 },
        textChunkLimit: { type: "integer", minimum: 1 },
        chunkMode: { type: "string", enum: ["length", "newline"] },
        mediaMaxMb: { type: "number", minimum: 0 },
      },
    },
  },
  config: {
    listAccountIds: () => [DEFAULT_ACCOUNT_ID],
    resolveAccount: (cfg) => resolveWecomAccount({ cfg }),
    defaultAccountId: () => DEFAULT_ACCOUNT_ID,
    setAccountEnabled: ({ cfg, enabled }) => ({
      ...cfg,
      channels: {
        ...cfg.channels,
        wecom: {
          ...cfg.channels?.wecom,
          enabled,
        },
      },
    }),
    deleteAccount: ({ cfg }) => {
      const next = { ...cfg } as ClawdbotConfig;
      const nextChannels = { ...cfg.channels };
      delete (nextChannels as Record<string, unknown>).wecom;
      if (Object.keys(nextChannels).length > 0) {
        next.channels = nextChannels;
      } else {
        delete next.channels;
      }
      return next;
    },
    isConfigured: (_account, cfg) =>
      Boolean(resolveWecomCredentials(cfg.channels?.wecom as WecomConfig | undefined)),
    describeAccount: (account) => ({
      accountId: account.accountId,
      enabled: account.enabled,
      configured: account.configured,
    }),
    resolveAllowFrom: ({ cfg }) =>
      (cfg.channels?.wecom as WecomConfig | undefined)?.allowFrom ?? [],
    formatAllowFrom: ({ allowFrom }) =>
      allowFrom
        .map((entry) => String(entry).trim())
        .filter(Boolean)
        .map((entry) => entry.toLowerCase()),
  },
  security: {
    collectWarnings: ({ cfg }) => {
      const wecomCfg = cfg.channels?.wecom as WecomConfig | undefined;
      const defaultGroupPolicy = (cfg.channels as Record<string, { groupPolicy?: string }> | undefined)?.defaults?.groupPolicy;
      const groupPolicy = wecomCfg?.groupPolicy ?? defaultGroupPolicy ?? "allowlist";
      if (groupPolicy !== "open") return [];
      return [
        `- WeChat Work groups: groupPolicy="open" allows any member to trigger (mention-gated). Set channels.wecom.groupPolicy="allowlist" + channels.wecom.groupAllowFrom to restrict senders.`,
      ];
    },
  },
  setup: {
    resolveAccountId: () => DEFAULT_ACCOUNT_ID,
    applyAccountConfig: ({ cfg }) => ({
      ...cfg,
      channels: {
        ...cfg.channels,
        wecom: {
          ...cfg.channels?.wecom,
          enabled: true,
        },
      },
    }),
  },
  onboarding: wecomOnboardingAdapter,
  messaging: {
    normalizeTarget: normalizeWecomTarget,
    targetResolver: {
      looksLikeId: looksLikeWecomId,
      hint: "<chatId|user:userId>",
    },
  },
  directory: {
    self: async () => null,
    listPeers: async ({ cfg, query, limit }) =>
      listWecomDirectoryPeers({ cfg, query, limit }),
    listGroups: async ({ cfg, query, limit }) =>
      listWecomDirectoryGroups({ cfg, query, limit }),
    listPeersLive: async ({ cfg, query, limit }) =>
      listWecomDirectoryPeersLive({ cfg, query, limit }),
    listGroupsLive: async ({ cfg, query, limit }) =>
      listWecomDirectoryGroupsLive({ cfg, query, limit }),
  },
  outbound: wecomOutbound,
  status: {
    defaultRuntime: {
      accountId: DEFAULT_ACCOUNT_ID,
      running: false,
      lastStartAt: null,
      lastStopAt: null,
      lastError: null,
      port: null,
    },
    buildChannelSummary: ({ snapshot }) => ({
      configured: snapshot.configured ?? false,
      running: snapshot.running ?? false,
      lastStartAt: snapshot.lastStartAt ?? null,
      lastStopAt: snapshot.lastStopAt ?? null,
      lastError: snapshot.lastError ?? null,
      port: snapshot.port ?? null,
      probe: snapshot.probe,
      lastProbeAt: snapshot.lastProbeAt ?? null,
    }),
    probeAccount: async ({ cfg }) =>
      await probeWecom(cfg.channels?.wecom as WecomConfig | undefined),
    buildAccountSnapshot: ({ account, runtime, probe }) => ({
      accountId: account.accountId,
      enabled: account.enabled,
      configured: account.configured,
      running: runtime?.running ?? false,
      lastStartAt: runtime?.lastStartAt ?? null,
      lastStopAt: runtime?.lastStopAt ?? null,
      lastError: runtime?.lastError ?? null,
      port: runtime?.port ?? null,
      probe,
    }),
  },
  gateway: {
    startAccount: async (ctx) => {
      const { monitorWecomProvider } = await import("./monitor.js");
      const wecomCfg = ctx.cfg.channels?.wecom as WecomConfig | undefined;
      const port = wecomCfg?.webhookPort ?? null;
      ctx.setStatus({ accountId: ctx.accountId, port });
      ctx.log?.info(`starting wecom provider (webhook on port ${port})`);
      return monitorWecomProvider({
        config: ctx.cfg,
        runtime: ctx.runtime,
        abortSignal: ctx.abortSignal,
        accountId: ctx.accountId,
      });
    },
  },
};
