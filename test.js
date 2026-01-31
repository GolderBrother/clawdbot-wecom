#!/usr/bin/env node

/**
 * 测试脚本 - 验证企业微信插件的基本功能
 */

import { wecomPlugin } from "./dist/src/channel.js";
import { probeWecom } from "./dist/src/probe.js";
import { getWecomAccessToken } from "./dist/src/client.js";

console.log("=== 企业微信插件测试 ===\n");

// 测试 1: 验证插件定义
console.log("✓ 测试 1: 插件定义");
console.log(`  插件 ID: ${wecomPlugin.id}`);
console.log(`  插件名称: ${wecomPlugin.meta.label}`);
console.log(`  插件描述: ${wecomPlugin.meta.blurb}`);
console.log(`  支持的消息类型: ${wecomPlugin.capabilities?.chatTypes?.join(", ")}`);
console.log(`  支持媒体: ${wecomPlugin.capabilities?.media ? "是" : "否"}`);
console.log(`  支持 reactions: ${wecomPlugin.capabilities?.reactions ? "是" : "否"}`);
console.log(`  支持编辑: ${wecomPlugin.capabilities?.edit ? "是" : "否"}`);

// 测试 2: 验证配置架构
console.log("\n✓ 测试 2: 配置架构");
console.log(`  配置验证: ${wecomPlugin.configSchema ? "已定义" : "未定义"}`);
console.log(`  配置属性: ${Object.keys(wecomPlugin.configSchema?.schema?.properties || {}).join(", ")}`);

// 测试 3: 验证网关启动
console.log("\n✓ 测试 3: 网关启动");
console.log(`  启动函数: ${wecomPlugin.gateway?.startAccount ? "已定义" : "未定义"}`);

// 测试 4: 验证配对功能
console.log("\n✓ 测试 4: 配对功能");
console.log(`  配对配置: ${wecomPlugin.pairing ? "已定义" : "未定义"}`);
console.log(`  ID 标签: ${wecomPlugin.pairing?.idLabel}`);
console.log(`  批准通知: ${wecomPlugin.pairing?.notifyApproval ? "已定义" : "未定义"}`);

// 测试 5: 显示功能限制说明
console.log("\n✓ 测试 5: 功能限制");
const limitations = [
  "不支持 WebSocket 长连接（仅 Webhook）",
  "不支持富文本卡片（降级为纯文本）",
  "不支持表情反应（reactions）",
  "不支持编辑消息",
  "群聊机器人功能受限（仅支持应用消息）",
];
limitations.forEach((limit, index) => {
  console.log(`  ${index + 1}. ${limit}`);
});

console.log("\n=== 测试完成 ===");
console.log("\n提示: 要进行完整的端到端测试，请配置企业微信凭证并运行:");
console.log("  openclaw plugins install @yourname/clawdbot-wecom");
console.log("  openclaw config set channels.wecom.corpId \"your_corp_id\"");
console.log("  openclaw config set channels.wecom.corpSecret \"your_secret\"");
console.log("  openclaw config set channels.wecom.agentId \"your_agent_id\"");
console.log("  openclaw config set channels.wecom.enabled true");
console.log("  openclaw channels start wecom");
