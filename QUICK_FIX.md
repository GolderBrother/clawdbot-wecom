# 企业微信插件快速修复指南

## 问题总结

1. ❌ **插件 ID 不匹配** - 插件清单 ID 与包名不一致
2. ❌ **网关服务问题** - 使用 NVM 的 Node，系统 Node 未安装
3. ❌ **RPC 探测失败** - 端口未正确监听
4. ❌ **境外服务器问题** - 企业微信无法访问境外服务器

---

## 🔧 快速修复步骤

### 方法 1：使用自动修复脚本（推荐）

```bash
# 1. 在服务器上执行
cd /tmp
curl -O https://raw.githubusercontent.com/GolderBrother/clawdbot-wecom/main/fix-wecom-plugin.sh
chmod +x fix-wecom-plugin.sh
./fix-wecom-plugin.sh
```

脚本会自动：
- ✅ 安装系统级 Node.js 22.x
- ✅ 重新创建插件包（修复 ID 不匹配）
- ✅ 备份当前配置
- ✅ 重新安装插件
- ✅ 配置企业微信参数
- ✅ 重建并启动服务
- ✅ 验证服务运行状态

### 方法 2：手动修复

#### 步骤 1：安装系统级 Node.js

```bash
# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo yum install -y nodejs

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt-get install -y nodejs
```

#### 步骤 2：停止服务并修复配置

```bash
# 停止服务
systemctl --user stop openclaw-gateway.service

# 备份配置
cp /root/.openclaw/openclaw.json /root/.openclaw/openclaw.json.backup

# 重建服务（使用系统 Node）
openclaw doctor --repair
```

#### 步骤 3：更新插件包

```bash
cd /tmp

# 下载最新代码
curl -L https://github.com/GolderBrother/clawdbot-wecom/archive/refs/heads/main.tar.gz -o wecom-main.tar.gz
mkdir -p wecom-tmp
tar -xzf wecom-main.tar.gz -C wecom-tmp
cd wecom-tmp/clawdbot-wecom-main

# 安装依赖
npm install

# 创建插件包
tar -czf /tmp/wecom-latest.tgz \
    --transform='s,^,clawdbot-wecom/,' \
    package.json \
    openclaw.plugin.json \
    index.ts \
    src/ \
    README.md

# 重新安装插件
openclaw plugins install --replace wecom --archive /tmp/wecom-latest.tgz
```

#### 步骤 4：配置企业微信参数

```bash
# 从企业微信后台获取以下信息：
# - corpId（企业 ID）
# - corpSecret（应用 Secret）
# - agentId（应用 AgentId）
# - token（回调验证 Token）
# - encodingAESKey（消息加密密钥）

# 配置插件
openclaw config set channels.wecom.corpId "wwxxxxxxxxxxxxxxxx"
openclaw config set channels.wecom.corpSecret "your_corp_secret"
openclaw config set channels.wecom.agentId 1000001
openclaw config set channels.wecom.token "your_token"
openclaw config set channels.wecom.encodingAESKey "your_aes_key"
openclaw config set channels.wecom.webhookPath "/wecom/events"
openclaw config set channels.wecom.webhookPort 18789
openclaw config set channels.wecom.enabled true
```

#### 步骤 5：启动服务并验证

```bash
# 启动服务
systemctl --user start openclaw-gateway.service

# 查看状态
systemctl --user status openclaw-gateway.service

# 查看日志
journalctl --user -u openclaw-gateway.service -n 50 --no-pager

# 验证端口监听
netstat -tuln | grep 18789

# 测试服务
curl -I http://127.0.0.1:18789/wecom/events
```

---

## 🌍 重要：境外服务器问题

### 问题原因

你的服务器在**硅谷（美国）**，但企业微信要求服务器必须在中国大陆境内。

```
❌ 当前服务器：43.162.111.96（美国硅谷）
✅ 企业微信要求：中国大陆服务器
```

### 解决方案

#### 方案 A：迁移到境内服务器（强烈推荐）

1. **购买中国大陆服务器**
   - 腾讯云轻量应用服务器：¥50-60/月
   - 链接：https://cloud.tencent.com/product/lighthouse
   - 选择机房：北京/上海/广州

2. **在新服务器上部署**
   ```bash
   # 使用自动修复脚本
   curl -O https://raw.githubusercontent.com/GolderBrother/clawdbot-wecom/main/fix-wecom-plugin.sh
   chmod +x fix-wecom-plugin.sh
   ./fix-wecom-plugin.sh
   ```

3. **配置企业微信回调**
   ```
   URL: http://new-china-server-ip:18789/wecom/events
   ```

#### 方案 B：使用境内代理

如果必须保留硅谷服务器：

```
┌──────────────┐         HTTPS        ┌──────────────┐
│ 企业微信服务器 │ ◀────────────────── │ 境内代理      │
│ (中国)       │  只能访问境内      │ (腾讯云/阿里云) │
└──────────────┘                    └──────────────┘
                                           │
                                           │ 内网穿透/frp
                                           │
                                   ┌───────▼───────┐
                                   │ 硅谷服务器     │
                                   │ 你的主服务     │
                                   └───────────────┘
```

需要：
1. 在境内购买便宜服务器（¥50/月）
2. 配置 Nginx 反向代理或 frp
3. 域名需要备案

#### 方案 C：使用云服务商的临时域名

某些云服务商提供临时测试域名，但通常需要境内服务器。

---

## 📋 完整配置示例

### 企业微信后台配置

```
URL:            http://your-server-ip:18789/wecom/events
Token:          your_token_from_wecom
EncodingAESKey: your_aes_key_from_wecom
消息加密:        ☑ 安全模式
```

### OpenClaw 配置文件

在 `/root/.openclaw/openclaw.json` 或 `clawd.json` 中：

```json
{
  "channels": {
    "wecom": {
      "enabled": true,
      "corpId": "ww1234567890abcdef",
      "corpSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "agentId": 1000001,
      "token": "abc123def456ghi789",
      "encodingAESKey": "abcdefghijklmnopqrstuvwxyz1234567890AB",
      "webhookPath": "/wecom/events",
      "webhookPort": 18789,
      "dmPolicy": "pairing",
      "groupPolicy": "allowlist",
      "requireMention": true,
      "mediaMaxMb": 30
    }
  }
}
```

---

## ✅ 验证步骤

### 1. 检查服务状态

```bash
openclaw status
```

预期输出：
```
Runtime: running (pid xxxxx, state active)
Gateway: bind=lan, port=18789
Plugins: wecom (enabled)
```

### 2. 检查端口监听

```bash
netstat -tuln | grep 18789
```

预期输出：
```
tcp  0  0  0.0.0.0:18789  0.0.0.0:*  LISTEN
```

### 3. 检查 Webhook 可访问性

```bash
# 从服务器本地测试
curl -I http://127.0.0.1:18789/wecom/events

# 从外部测试（替换为你的服务器 IP）
curl -I http://your-server-ip:18789/wecom/events
```

预期输出：
```
HTTP/1.1 200 OK
```

### 4. 配置企业微信回调

在企业微信后台填写：
```
URL: http://your-server-ip:18789/wecom/events
```

点击保存后，在服务器日志中查看：

```bash
journalctl --user -u openclaw-gateway.service -f
```

预期看到：
```
✅ wecom: callback URL verified successfully
```

---

## 🔍 常见问题排查

### 问题 1：服务启动失败

```bash
# 查看详细日志
journalctl --user -u openclaw-gateway.service -n 100 --no-pager

# 查看 OpenClaw 日志
cat /tmp/openclaw/openclaw-*.log
```

### 问题 2：端口未监听

```bash
# 检查端口是否被占用
lsof -i :18789

# 检查防火墙
firewall-cmd --list-ports

# 开放端口
firewall-cmd --permanent --add-port=18789/tcp
firewall-cmd --reload
```

### 问题 3：企业微信验证失败

检查：
1. Token 是否正确
2. encodingAESKey 是否正确
3. 服务器在中国大陆境内
4. URL 是否可从外网访问

### 问题 4：插件仍然报错 ID 不匹配

重新安装插件：
```bash
# 卸载
openclaw plugins uninstall wecom

# 重新安装
openclaw plugins install --replace wecom --archive /tmp/wecom-latest.tgz
```

---

## 📞 获取帮助

如果问题仍未解决：

1. 查看完整日志：
   ```bash
   openclaw status
   journalctl --user -u openclaw-gateway.service -n 200
   ```

2. 运行诊断：
   ```bash
   openclaw doctor
   ```

3. 查看故障排查指南：
   https://docs.openclaw.ai/troubleshooting

---

## 📝 总结

**最简单、最快速的解决方案**：

1. 🛒 在 **腾讯云** 购买一台中国大陆服务器（¥50-60/月）
2. 🚀 执行 `fix-wecom-plugin.sh` 脚本
3. ⚙️ 将服务器 IP 填入企业微信回调配置
4. ✅ 验证通过

**预计时间**：1-2 小时（包括购买和部署）

**预计成本**：¥50-60/月（第一年可能更便宜）
