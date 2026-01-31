#!/bin/bash
# 企业微信插件 ID 修复脚本
# 用于修复插件名称不匹配问题

set -e

echo "=== 企业微信插件 ID 修复脚本 ==="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否在服务器上运行
if [ ! -d "/root/.openclaw" ]; then
    echo -e "${RED}错误: 此脚本需要在运行 openclaw 的服务器上执行${NC}"
    exit 1
fi

echo "1. 停止 OpenClaw 服务..."
systemctl --user stop openclaw-gateway.service 2>/dev/null || true
echo -e "${GREEN}✓ 服务已停止${NC}"
echo ""

echo "2. 备份当前配置..."
if [ -f "/root/.openclaw/openclaw.json" ]; then
    cp /root/.openclaw/openclaw.json /root/.openclaw/openclaw.json.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✓ 配置已备份${NC}"
else
    echo -e "${YELLOW}配置文件不存在，跳过备份${NC}"
fi
echo ""

echo "3. 移除旧的企业微信插件配置..."
# 使用 openclaw CLI 移除插件（如果已安装）
/root/.nvm/versions/node/v22.22.0/bin/openclaw plugins uninstall wecom 2>/dev/null || true
/root/.nvm/versions/node/v22.22.0/bin/openclaw plugins uninstall clawdbot-wecom 2>/dev/null || true
echo -e "${GREEN}✓ 旧插件已移除${NC}"
echo ""

echo "4. 下载最新插件代码..."
cd /tmp
rm -rf wecom-new
mkdir -p wecom-new
cd wecom-new

# 从 GitHub 下载最新版本
echo "正在从 GitHub 下载最新代码..."
curl -L https://github.com/GolderBrother/clawdbot-wecom/archive/refs/heads/main.tar.gz -o wecom-main.tar.gz
tar -xzf wecom-main.tar.gz --strip-components=1
echo -e "${GREEN}✓ 代码下载完成${NC}"
echo ""

echo "5. 安装依赖..."
npm install
echo -e "${GREEN}✓ 依赖安装完成${NC}"
echo ""

echo "6. 创建插件包..."
tar -czf /tmp/clawdbot-wecom-latest.tgz \
    package.json \
    openclaw.plugin.json \
    index.ts \
    src/ \
    README.md
echo -e "${GREEN}✓ 插件包创建完成${NC}"
echo ""

echo "7. 安装企业微信插件..."
/root/.nvm/versions/node/v22.22.0/bin/openclaw plugins install clawdbot-wecom --archive /tmp/clawdbot-wecom-latest.tgz
echo -e "${GREEN}✓ 插件已安装${NC}"
echo ""

echo "8. 配置企业微信参数..."
read -p "请输入企业 ID (corpId): " CORP_ID
read -p "请输入应用 Secret (corpSecret): " CORP_SECRET
read -p "请输入应用 AgentId: " AGENT_ID
read -p "请输入回调验证 Token: " TOKEN
read -p "请输入消息加密密钥 (encodingAESKey): " ENCODING_KEY

# 配置插件
/root/.nvm/versions/node/v22.22.0/bin/openclaw config set channels.clawdbot-wecom.corpId "$CORP_ID"
/root/.nvm/versions/node/v22.22.0/bin/openclaw config set channels.clawdbot-wecom.corpSecret "$CORP_SECRET"
/root/.nvm/versions/node/v22.22.0/bin/openclaw config set channels.clawdbot-wecom.agentId "$AGENT_ID"
/root/.nvm/versions/node/v22.22.0/bin/openclaw config set channels.clawdbot-wecom.token "$TOKEN"
/root/.nvm/versions/node/v22.22.0/bin/openclaw config set channels.clawdbot-wecom.encodingAESKey "$ENCODING_KEY"
/root/.nvm/versions/node/v22.22.0/bin/openclaw config set channels.clawdbot-wecom.webhookPath "/wecom/events"
/root/.nvm/versions/node/v22.22.0/bin/openclaw config set channels.clawdbot-wecom.webhookPort 18789
/root/.nvm/versions/node/v22.22.0/bin/openclaw config set channels.clawdbot-wecom.enabled true

echo -e "${GREEN}✓ 企业微信配置已更新${NC}"
echo ""

echo "9. 重建服务..."
/root/.nvm/versions/node/v22.22.0/bin/openclaw doctor --repair
echo -e "${GREEN}✓ 服务已重建${NC}"
echo ""

echo "10. 启动 OpenClaw 服务..."
systemctl --user start openclaw-gateway.service
echo -e "${GREEN}✓ 服务已启动${NC}"
echo ""

echo "11. 等待服务启动..."
sleep 5

# 检查服务状态
if systemctl --user is-active --quiet openclaw-gateway.service; then
    echo -e "${GREEN}✓ 服务运行正常${NC}"
else
    echo -e "${RED}✗ 服务启动失败${NC}"
    echo ""
    echo "查看日志："
    echo "  journalctl --user -u openclaw-gateway.service -n 50 --no-pager"
    echo ""
    echo "查看状态："
    echo "  /root/.nvm/versions/node/v22.22.0/bin/openclaw status"
    exit 1
fi

# 检查端口
if netstat -tuln 2>/dev/null | grep -q ":18789 "; then
    echo -e "${GREEN}✓ 端口 18789 正在监听${NC}"
else
    echo -e "${YELLOW}⚠️  端口 18789 未监听，可能需要等待更长时间${NC}"
fi

echo ""
echo "=== 修复完成 ==="
echo ""
echo "服务器信息："
echo "  公网 IP: $(curl -s ifconfig.me 2>/dev/null || echo '未知')"
echo "  端口: 18789"
echo "  Webhook 路径: /wecom/events"
echo ""
echo "企业微信配置 URL："
echo -e "${GREEN}  http://$(curl -s ifconfig.me 2>/dev/null || echo 'your-server-ip'):18789/wecom/events${NC}"
echo ""
echo -e "${YELLOW}⚠️  重要提示：${NC}"
echo "1. 你的插件名称现在是: ${GREEN}clawdbot-wecom${NC}"
echo "2. 配置路径是: ${GREEN}channels.clawdbot-wecom${NC} (不是 channels.wecom)"
echo "3. 如果服务器在中国大陆境外，企业微信无法访问！"
echo ""
echo "下一步："
echo "1. 将上述 URL 配置到企业微信后台的'接收消息服务器配置'"
echo "2. 确保 Token 和 encodingAESKey 与企业微信后台一致"
echo "3. 点击保存并等待验证"
echo ""
echo "查看状态："
echo "  /root/.nvm/versions/node/v22.22.0/bin/openclaw status"
echo ""
echo "查看日志："
echo "  journalctl --user -u openclaw-gateway.service -f"
