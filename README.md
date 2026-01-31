# clawdbot-wecom

WeChat Work (企业微信) channel plugin for [OpenClaw](https://github.com/openclaw/openclaw).

## 功能特性

- Webhook 回调消息接收
- 应用消息推送（文本、图片、文件）
- 媒体上传下载（通过企业微信素材库）
- 权限控制（白名单、配对审批、群聊策略）
- @机器人触发机制
- 用户和群组目录查询
- 历史消息上下文记录（群聊）
- 连接探测和状态监控

## 安装

```bash
openclaw plugins install @yourname/clawdbot-wecom
```

或通过 npm 安装：

```bash
npm install @yourname/clawdbot-wecom
```

## 配置

1. 在 [企业微信管理后台](https://work.weixin.qq.com/) 创建自建应用
2. 获取企业 ID、应用 Secret、AgentId
3. 配置 Webhook 回调 URL
4. 配置插件：

```bash
openclaw config set channels.wecom.corpId "wwxxxxx"
openclaw config set channels.wecom.corpSecret "your_secret"
openclaw config set channels.wecom.agentId "1000001"
openclaw config set channels.wecom.token "your_token"
openclaw config set channels.wecom.webhookPort 3000
openclaw config set channels.wecom.enabled true
```

## 配置选项

```yaml
channels:
  wecom:
    enabled: true
    corpId: "wwxxxxx"           # 企业 ID
    corpSecret: "secret"          # 应用 Secret
    agentId: 1000001             # 应用 AgentId
    token: "token"              # 回调验证 Token
    encodingAESKey: "key"        # 消息加密密钥（可选）
    webhookPath: "/wecom/events"   # Webhook 路径
    webhookPort: 3000            # Webhook 服务器端口
    dmPolicy: "pairing"          # 私聊策略: "open" | "pairing" | "allowlist"
    allowFrom: []               # 私聊白名单
    groupPolicy: "allowlist"     # 群聊策略: "open" | "allowlist" | "disabled"
    groupAllowFrom: []          # 群聊白名单
    requireMention: true          # 群聊是否需要 @机器人
    mediaMaxMb: 30             # 媒体文件最大大小 (MB)
```

## 主要限制

- 不支持 WebSocket 长连接，仅支持 Webhook 回调
- 不支持富文本卡片，降级为纯文本
- 不支持表情反应（reactions）
- 不支持编辑消息
- 群聊机器人功能受限（仅支持应用消息）

## License

MIT
