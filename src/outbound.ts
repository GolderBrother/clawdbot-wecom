import type { ChannelOutboundAdapter } from "openclaw/plugin-sdk";
import { getWecomRuntime } from "./runtime.js";
import { sendMessageWecom } from "./send.js";
import { sendMediaWecom } from "./media.js";

export const wecomOutbound: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  chunker: (text, limit) => getWecomRuntime().channel.text.chunkMarkdownText(text, limit),
  chunkerMode: "markdown",
  textChunkLimit: 2048, // WeChat Work has smaller limits
  sendText: async ({ cfg, to, text }) => {
    const result = await sendMessageWecom({ cfg, to, text });
    return { channel: "wecom", ...result };
  },
  sendMedia: async ({ cfg, to, text, mediaUrl }) => {
    // Send text first if provided
    if (text?.trim()) {
      await sendMessageWecom({ cfg, to, text });
    }

    // Upload and send media if URL provided
    if (mediaUrl) {
      try {
        const result = await sendMediaWecom({
          cfg,
          to,
          mediaUrl,
          fileName: "media", // Could extract from URL
        });
        return { channel: "wecom", ...result };
      } catch (err) {
        console.error(`[wecom] sendMediaWecom failed:`, err);
        // Fallback to URL link if upload fails
        const fallbackText = `📎 ${mediaUrl}`;
        const result = await sendMessageWecom({ cfg, to, text: fallbackText });
        return { channel: "wecom", ...result };
      }
    }

    // No media URL, just return text result
    const result = await sendMessageWecom({
      cfg,
      to,
      text: text ?? "",
    });
    return { channel: "wecom", ...result };
  },
};
