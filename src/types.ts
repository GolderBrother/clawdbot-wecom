import type { WecomConfigSchema, WecomGroupSchema, z } from "./config-schema.js";

export type WecomConfig = z.infer<typeof WecomConfigSchema>;
export type WecomGroupConfig = z.infer<typeof WecomGroupSchema>;

export type ResolvedWecomAccount = {
  accountId: string;
  enabled: boolean;
  configured: boolean;
  corpId?: string;
  agentId?: string;
};

export type WecomMessageContext = {
  chatId: string;
  messageId: string;
  senderId: string;
  senderName?: string;
  chatType: "p2p" | "group";
  mentionedBot: boolean;
  content: string;
  contentType: string;
};

export type WecomSendResult = {
  messageId: string;
  chatId: string;
};

export type WecomProbeResult = {
  ok: boolean;
  error?: string;
  corpId?: string;
  agentId?: string;
  corpName?: string;
};

export type WecomMediaInfo = {
  path: string;
  contentType?: string;
  placeholder: string;
};

export type WecomIdType = "userid" | "chatid";

export type WecomMessageEvent = {
  ToUserName: string;
  FromUserName: string;
  CreateTime: number;
  MsgType: string;
  Content?: string;
  MsgId: number;
  AgentID: number;
  MediaId?: string;
  FileName?: string;
  FileSize?: number;
  Title?: string;
  Description?: string;
  Url?: string;
};
