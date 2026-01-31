import type { ClawdbotConfig, RuntimeEnv } from "openclaw/plugin-sdk";
import type {
  WecomConfig,
  WecomMessageContext,
  WecomMessageEvent,
} from "./types.js";
import { getFeishuRuntime as getWecomRuntime } from "./runtime.js";
import { resolveWecomCredentials } from "./accounts.js";
import {
  resolveWecomGroupConfig,
  resolveWecomReplyPolicy,
  resolveWecomAllowlistMatch,
  isWecomGroupAllowed,
} from "./policy.js";
import { sendMessageWecom } from "./send.js";
import { downloadMediaWecom } from "./media.js";
import {
  buildPendingHistoryContextFromMap,
  recordPendingHistoryEntryIfEnabled,
  clearHistoryEntriesIfEnabled,
  DEFAULT_GROUP_HISTORY_LIMIT,
  type HistoryEntry,
} from "openclaw/plugin-sdk";

export async function handleWecomMessage(params: {
  cfg: ClawdbotConfig;
  event: WecomMessageEvent;
  botOpenId?: string;
  runtime?: RuntimeEnv;
}): Promise<void> {
  const { cfg, event, botOpenId, runtime } = params;
  const wecomCfg = cfg.channels?.wecom as WecomConfig | undefined;
  const log = runtime?.log ?? console.log;
  const error = runtime?.error ?? console.error;

  let ctx = parseWecomMessageEvent(event, botOpenId);
  const isGroup = ctx.chatType === "group";

  log(`wecom: received message from ${ctx.senderId} in ${ctx.chatId} (${ctx.chatType})`);

  const historyLimit = Math.max(
    0,
    wecomCfg?.historyLimit ??
    cfg.messages?.groupChat?.historyLimit ??
    DEFAULT_GROUP_HISTORY_LIMIT
  );

  if (isGroup) {
    const groupPolicy = wecomCfg?.groupPolicy ?? "open";
    const groupAllowFrom = wecomCfg?.groupAllowFrom ?? [];
    const groupConfig = resolveWecomGroupConfig({
      cfg: wecomCfg,
      groupId: ctx.chatId,
    });

    const senderAllowFrom = groupConfig?.allowFrom ?? groupAllowFrom;
    const allowed = isWecomGroupAllowed({
      groupPolicy,
      allowFrom: senderAllowFrom,
      senderId: ctx.senderId,
      senderName: ctx.senderName,
    });

    if (!allowed) {
      log(`wecom: sender ${ctx.senderId} not in group allowlist`);
      return;
    }

    const { requireMention } = resolveWecomReplyPolicy({
      isDirectMessage: false,
      globalConfig: wecomCfg,
      groupConfig,
    });

    if (requireMention && !ctx.mentionedBot) {
      log(
        `wecom: message in group ${ctx.chatId} did not mention bot, recording to history`
      );
      return;
    }
  } else {
    const dmPolicy = wecomCfg?.dmPolicy ?? "pairing";
    const allowFrom = wecomCfg?.allowFrom ?? [];

    if (dmPolicy === "allowlist") {
      const match = resolveWecomAllowlistMatch({
        allowFrom,
        senderId: ctx.senderId,
      });
      if (!match.allowed) {
        log(`wecom: sender ${ctx.senderId} not in DM allowlist`);
        return;
      }
    }
  }

  try {
    const core = getWecomRuntime();

    const wecomFrom = `wecom:${ctx.senderId}`;
    const wecomTo = isGroup ? `chat:${ctx.chatId}` : `user:${ctx.senderId}`;

    const route = core.channel.routing.resolveAgentRoute({
      cfg,
      channel: "wecom",
      peer: {
        kind: isGroup ? "group" : "dm",
        id: isGroup ? ctx.chatId : ctx.senderId,
      },
    });

    const preview = ctx.content.replace(/\s+/g, " ").slice(0, 160);
    const inboundLabel = isGroup
      ? `WeChat Work message in group ${ctx.chatId}`
      : `WeChat Work DM from ${ctx.senderId}`;

    core.system.enqueueSystemEvent(`${inboundLabel}: ${preview}`, {
      sessionKey: route.sessionKey,
      contextKey: `wecom:message:${ctx.chatId}:${ctx.messageId}`,
    });

    const envelopeFrom = isGroup
      ? `${ctx.chatId}:${ctx.senderId}`
      : ctx.senderId;

    const body = core.channel.reply.formatAgentEnvelope({
      channel: "WeChat Work",
      from: envelopeFrom,
      timestamp: new Date(),
      body: ctx.content,
    });

    const ctxPayload = core.channel.reply.finalizeInboundContext({
      Body: body,
      RawBody: ctx.content,
      CommandBody: ctx.content,
      From: wecomFrom,
      To: wecomTo,
      SessionKey: route.sessionKey,
      AccountId: route.accountId,
      ChatType: isGroup ? "group" : "direct",
      GroupSubject: isGroup ? ctx.chatId : undefined,
      SenderName: ctx.senderName ?? ctx.senderId,
      SenderId: ctx.senderId,
      Provider: "wecom" as const,
      Surface: "wecom" as const,
      MessageSid: ctx.messageId,
      Timestamp: Date.now(),
      WasMentioned: ctx.mentionedBot,
      CommandAuthorized: true,
      OriginatingChannel: "wecom" as const,
      OriginatingTo: wecomTo,
    });

    const { dispatcher, replyOptions, markDispatchIdle } = createWecomReplyDispatcher({
      cfg,
      agentId: route.agentId,
      runtime: runtime as RuntimeEnv,
      chatId: ctx.chatId,
    });

    log(`wecom: dispatching to agent (session=${route.sessionKey})`);

    const { queuedFinal, counts } = await core.channel.reply.dispatchReplyFromConfig({
      ctx: ctxPayload,
      cfg,
      dispatcher,
      replyOptions,
    });

    markDispatchIdle();

    log(
      `wecom: dispatch complete (queuedFinal=${queuedFinal}, replies=${counts.final})`
    );
  } catch (err) {
    error(`wecom: failed to dispatch message: ${String(err)}`);
  }
}

export function parseWecomMessageEvent(
  event: WecomMessageEvent,
  botOpenId?: string
): WecomMessageContext {
  const content = event.Content ?? "";
  const chatId = event.ToUserName;
  const messageId = event.MsgId?.toString() ?? Date.now().toString();

  // Check if bot is mentioned (in group chat)
  const mentionedBot = checkBotMentioned(content, botOpenId);

  return {
    chatId,
    messageId,
    senderId: event.FromUserName,
    senderName: undefined, // Could resolve from API if needed
    chatType: chatId.includes("@chat") ? "group" : "p2p",
    mentionedBot,
    content,
    contentType: event.MsgType,
  };
}

function checkBotMentioned(content: string, botOpenId?: string): boolean {
  if (!botOpenId) return false;
  return content.includes(botOpenId);
}

function createWecomReplyDispatcher(params: {
  cfg: ClawdbotConfig;
  agentId: string;
  runtime: RuntimeEnv;
  chatId: string;
}): {
  dispatcher: (message: string) => Promise<void>;
  replyOptions: Record<string, unknown>;
  markDispatchIdle: () => void;
} {
  const { cfg, agentId, runtime, chatId } = params;

  const dispatcher = async (message: string) => {
    await sendMessageWecom({
      cfg,
      to: chatId,
      text: message,
    });
  };

  const replyOptions = {};

  const markDispatchIdle = () => {};

  return { dispatcher, replyOptions, markDispatchIdle };
}
