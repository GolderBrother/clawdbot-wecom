import type { ClawdbotConfig } from "openclaw/plugin-sdk";
import type { WecomConfig } from "./types.js";
import { normalizeWecomTarget } from "./targets.js";
import { getDepartmentUsers, getUserInfo } from "./client.js";

export type WecomDirectoryPeer = {
  kind: "user";
  id: string;
  name?: string;
};

export type WecomDirectoryGroup = {
  kind: "group";
  id: string;
  name?: string;
};

export async function listWecomDirectoryPeers(params: {
  cfg: ClawdbotConfig;
  query?: string;
  limit?: number;
}): Promise<WecomDirectoryPeer[]> {
  const wecomCfg = params.cfg.channels?.wecom as WecomConfig | undefined;
  const q = params.query?.trim().toLowerCase() || "";
  const ids = new Set<string>();

  // From allowlist config
  for (const entry of wecomCfg?.allowFrom ?? []) {
    const trimmed = String(entry).trim();
    if (trimmed && trimmed !== "*") ids.add(trimmed);
  }

  // From DM config
  for (const userId of Object.keys(wecomCfg?.dms ?? {})) {
    const trimmed = userId.trim();
    if (trimmed) ids.add(trimmed);
  }

  return Array.from(ids)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .map((raw) => normalizeWecomTarget(raw) ?? raw)
    .filter((id) => (q ? id.toLowerCase().includes(q) : true))
    .slice(0, params.limit && params.limit > 0 ? params.limit : undefined)
    .map((id) => ({ kind: "user" as const, id }));
}

export async function listWecomDirectoryGroups(params: {
  cfg: ClawdbotConfig;
  query?: string;
  limit?: number;
}): Promise<WecomDirectoryGroup[]> {
  const wecomCfg = params.cfg.channels?.wecom as WecomConfig | undefined;
  const q = params.query?.trim().toLowerCase() || "";
  const ids = new Set<string>();

  // From group config
  for (const groupId of Object.keys(wecomCfg?.groups ?? {})) {
    const trimmed = groupId.trim();
    if (trimmed && trimmed !== "*") ids.add(trimmed);
  }

  // From group allowlist
  for (const entry of wecomCfg?.groupAllowFrom ?? []) {
    const trimmed = String(entry).trim();
    if (trimmed && trimmed !== "*") ids.add(trimmed);
  }

  return Array.from(ids)
    .map((raw) => raw.trim())
    .filter(Boolean)
    .filter((id) => (q ? id.toLowerCase().includes(q) : true))
    .slice(0, params.limit && params.limit > 0 ? params.limit : undefined)
    .map((id) => ({ kind: "group" as const, id }));
}

export async function listWecomDirectoryPeersLive(params: {
  cfg: ClawdbotConfig;
  query?: string;
  limit?: number;
}): Promise<WecomDirectoryPeer[]> {
  const wecomCfg = params.cfg.channels?.wecom as WecomConfig | undefined;
  if (!wecomCfg?.corpId || !wecomCfg?.corpSecret) {
    return listWecomDirectoryPeers(params);
  }

  try {
    const peers: WecomDirectoryPeer[] = [];
    const limit = params.limit ?? 50;
    const q = params.query?.trim().toLowerCase() || "";

    // Get users from root department
    const result = await getDepartmentUsers(wecomCfg, 1, true);

    if (result.errcode === 0 && result.userlist) {
      for (const user of result.userlist) {
        if (user.userid) {
          if (
            !q ||
            user.userid.toLowerCase().includes(q) ||
            (user.name && user.name.toLowerCase().includes(q))
          ) {
            peers.push({
              kind: "user",
              id: user.userid,
              name: user.name || undefined,
            });
          }
        }
        if (peers.length >= limit) break;
      }
    }

    return peers;
  } catch {
    return listWecomDirectoryPeers(params);
  }
}

export async function listWecomDirectoryGroupsLive(params: {
  cfg: ClawdbotConfig;
  query?: string;
  limit?: number;
}): Promise<WecomDirectoryGroup[]> {
  // WeChat Work doesn't have a simple API to list all groups
  // Groups are managed in the admin console
  // Return configured groups only
  return listWecomDirectoryGroups(params);
}
