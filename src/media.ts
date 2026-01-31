import type { ClawdbotConfig } from "openclaw/plugin-sdk";
import type { WecomConfig, WecomMediaInfo } from "./types.js";
import { getWecomRuntime } from "./runtime.js";
import { uploadMedia, downloadMedia } from "./client.js";
import { sendImageWecom as sendUploadedImageWecom, sendFileWecom as sendUploadedFileWecom } from "./send.js";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

export type UploadMediaResult = {
  mediaId: string;
};

export async function uploadMediaWecom(params: {
  cfg: ClawdbotConfig;
  type: "image" | "voice" | "video" | "file";
  file: Buffer | string;
  fileName?: string;
}): Promise<UploadMediaResult> {
  const { cfg, type, file, fileName } = params;
  const wecomCfg = cfg.channels?.wecom as WecomConfig | undefined;
  if (!wecomCfg) {
    throw new Error("WeChat Work channel not configured");
  }

  let fileBuffer: Buffer;
  let name: string;

  if (typeof file === "string") {
    // Local file path
    const filePath = file.startsWith("~")
      ? file.replace("~", process.env.HOME ?? "")
      : file.replace("file://", "");

    if (!fs.existsSync(filePath)) {
      throw new Error(`Local file not found: ${filePath}`);
    }
    fileBuffer = fs.readFileSync(filePath);
    name = fileName ?? path.basename(filePath);
  } else {
    // Buffer
    fileBuffer = file;
    name = fileName ?? "file";
  }

  const result = await uploadMedia(wecomCfg, type, fileBuffer, name);
  return {
    mediaId: result.media_id,
  };
}

export async function downloadMediaWecom(params: {
  cfg: ClawdbotConfig;
  mediaId: string;
}): Promise<Buffer> {
  const { cfg, mediaId } = params;
  const wecomCfg = cfg.channels?.wecom as WecomConfig | undefined;
  if (!wecomCfg) {
    throw new Error("WeChat Work channel not configured");
  }

  return downloadMedia(wecomCfg, mediaId);
}

export async function sendImageWecom(params: {
  cfg: ClawdbotConfig;
  to: string;
  mediaUrl?: string;
  mediaBuffer?: Buffer;
  fileName?: string;
}): Promise<{
  messageId: string;
  chatId: string;
}> {
  const { cfg, to, mediaUrl, mediaBuffer, fileName } = params;

  let buffer: Buffer;
  let name: string;

  if (mediaBuffer) {
    buffer = mediaBuffer;
    name = fileName ?? "image.jpg";
  } else if (mediaUrl) {
    // Fetch remote URL
    const response = await fetch(mediaUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image from URL: ${response.status}`);
    }
    buffer = Buffer.from(await response.arrayBuffer());
    const urlPathname = new URL(mediaUrl).pathname;
    name = fileName ?? (path.basename(urlPathname) || "image.jpg");
  } else {
    throw new Error("Either mediaUrl or mediaBuffer must be provided");
  }

  const { mediaId } = await uploadMediaWecom({
    cfg,
    type: "image",
    file: buffer,
    fileName: name,
  });

  return sendUploadedImageWecom({ cfg, to, imageKey: mediaId });
}

export async function sendFileWecom(params: {
  cfg: ClawdbotConfig;
  to: string;
  mediaUrl?: string;
  mediaBuffer?: Buffer;
  fileName?: string;
}): Promise<{
  messageId: string;
  chatId: string;
}> {
  const { cfg, to, mediaUrl, mediaBuffer, fileName } = params;

  let buffer: Buffer;
  let name: string;

  if (mediaBuffer) {
    buffer = mediaBuffer;
    name = fileName ?? "file";
  } else if (mediaUrl) {
    // Fetch remote URL
    const response = await fetch(mediaUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from URL: ${response.status}`);
    }
    buffer = Buffer.from(await response.arrayBuffer());
    const urlPathname = new URL(mediaUrl).pathname;
    name = fileName ?? (path.basename(urlPathname) || "file");
  } else {
    throw new Error("Either mediaUrl or mediaBuffer must be provided");
  }

  // Determine file type
  const fileType = detectFileType(name);
  const { mediaId } = await uploadMediaWecom({
    cfg,
    type: fileType,
    file: buffer,
    fileName: name,
  });

  return sendUploadedFileWecom({ cfg, to, fileKey: mediaId });
}

function detectFileType(fileName: string): "image" | "voice" | "video" | "file" {
  const ext = path.extname(fileName).toLowerCase();
  const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".bmp"];
  const voiceExts = [".amr", ".silk"];
  const videoExts = [".mp4", ".mov", ".avi"];

  if (imageExts.includes(ext)) return "image";
  if (voiceExts.includes(ext)) return "voice";
  if (videoExts.includes(ext)) return "video";
  return "file";
}

export async function sendMediaWecom(params: {
  cfg: ClawdbotConfig;
  to: string;
  mediaUrl?: string;
  mediaBuffer?: Buffer;
  fileName?: string;
}): Promise<{
  messageId: string;
  chatId: string;
}> {
  const { fileName } = params;

  if (!fileName) {
    throw new Error("fileName must be provided for media detection");
  }

  const fileType = detectFileType(fileName);

  if (fileType === "image") {
    return sendImageWecom(params);
  } else {
    return sendFileWecom(params);
  }
}
