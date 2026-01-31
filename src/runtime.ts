import type { RuntimeEnv } from "openclaw/plugin-sdk";

let wecomRuntime: RuntimeEnv | null = null;

export function getWecomRuntime(): RuntimeEnv {
  if (!wecomRuntime) {
    throw new Error("WeChat Work runtime not initialized");
  }
  return wecomRuntime;
}

export function setWecomRuntime(runtime: RuntimeEnv): void {
  wecomRuntime = runtime;
}
