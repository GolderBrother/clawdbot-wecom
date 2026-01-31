import type { ClawdbotConfig, RuntimeEnv } from "openclaw/plugin-sdk";
import { sendMessageWecom } from "./send.js";

export type CreateWecomReplyDispatcherOpts = {
  cfg: ClawdbotConfig;
  agentId: string;
  runtime: RuntimeEnv;
  chatId: string;
};

export function createWecomReplyDispatcher(
  opts: CreateWecomReplyDispatcherOpts
): {
  dispatcher: (message: string) => Promise<void>;
  replyOptions: Record<string, unknown>;
  markDispatchIdle: () => void;
} {
  const { cfg, chatId, runtime } = opts;
  const log = runtime?.log ?? console.log;

  let isDispatching = false;

  const dispatcher = async (message: string) => {
    if (isDispatching) {
      log(`wecom: message dispatch already in progress, skipping`);
      return;
    }

    isDispatching = true;
    try {
      await sendMessageWecom({
        cfg,
        to: chatId,
        text: message,
      });
    } finally {
      isDispatching = false;
    }
  };

  const replyOptions = {};

  const markDispatchIdle = () => {
    isDispatching = false;
  };

  return { dispatcher, replyOptions, markDispatchIdle };
}
