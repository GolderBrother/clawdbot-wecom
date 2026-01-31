import type { WecomConfig } from "./types.js";

export function normalizeWecomTarget(target: string): string | null {
  if (!target) return null;

  target = target.trim();

  // Remove user: or chat: prefix
  const prefixes = ["user:", "chat:", "wecom:"];
  for (const prefix of prefixes) {
    if (target.startsWith(prefix)) {
      return target.slice(prefix.length);
    }
  }

  return target;
}

export function detectIdType(target: string): "user" | "chat" | null {
  const normalized = normalizeWecomTarget(target);
  if (!normalized) return null;

  // WeChat Work user IDs are typically numeric or longer strings
  // Chat IDs are typically longer and may have different patterns
  // This is a basic heuristic - adjust based on actual data
  if (/^\d+$/.test(normalized)) {
    // Numeric ID could be either user or chat
    return "user";
  }

  return "chat";
}

export function formatWecomTarget(
  target: string,
  type: "user" | "chat"
): string {
  const normalized = normalizeWecomTarget(target);
  if (!normalized) return target;

  return `${type}:${normalized}`;
}

export function looksLikeWecomId(id: string): boolean {
  if (!id) return false;
  const normalized = normalizeWecomTarget(id);
  if (!normalized) return false;

  // Accept various formats
  // user:xxx
  // chat:xxx
  // wecom:xxx
  // Raw ID
  const patterns = [
    /^user:/,
    /^chat:/,
    /^wecom:/,
    /^[a-zA-Z0-9_-]+$/,
  ];

  return patterns.some((pattern) => pattern.test(normalized));
}
