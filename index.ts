import type { ClawdbotPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { wecomPlugin } from "./src/channel.js";
import { setWecomRuntime } from "./src/runtime.js";

export { monitorWecomProvider } from "./src/monitor.js";
export {
  sendMessageWecom,
  sendMarkdownWecom,
  sendImageWecom,
  sendFileWecom,
} from "./src/send.js";
export {
  uploadMediaWecom,
  downloadMediaWecom,
  sendImageWecom as sendMediaImageWecom,
  sendFileWecom as sendMediaFileWecom,
  sendMediaWecom,
} from "./src/media.js";
export { probeWecom } from "./src/probe.js";

const plugin = {
  id: "wecom",
  name: "WeChat Work",
  description: "WeChat Work (企业微信) channel plugin",
  configSchema: emptyPluginConfigSchema(),
  register(api: ClawdbotPluginApi) {
    setWecomRuntime(api.runtime);
    api.registerChannel({ plugin: wecomPlugin });
  },
};

export default plugin;
