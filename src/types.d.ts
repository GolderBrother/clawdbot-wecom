// Type declarations for openclaw/plugin-sdk
declare module 'openclaw/plugin-sdk' {
  export interface ClawdbotPluginApi {
    runtime: any;
    registerChannel: (channel: any) => void;
  }

  export const emptyPluginConfigSchema: () => any;
  export const DEFAULTACCOUNTID: string;

  export interface ChannelPlugin<TAccount = any> {
    id: string;
    meta: any;
    pairing?: any;
    capabilities?: any;
    agentPrompt?: any;
    configSchema?: any;
    gateway?: any;
  }

  export interface MessageContext {
    accountId: string;
    channelId?: string;
    userId?: string;
    message: string;
    media?: any[];
    threadId?: string;
    replyToId?: string;
    mentions?: string[];
  }

  export interface Runtime {
    logger: any;
    metrics: any;
  }
}
