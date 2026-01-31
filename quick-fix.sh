#!/bin/bash
# 企业微信插件快速修复脚本
# 修复插件 ID 不匹配问题并正确配置

set -e

echo "=== 企业微信插件快速修复 ==="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. 停止服务
echo "1. 停止服务..."
systemctl --user stop openclaw-gateway.service 2>/dev/null || true
echo -e "${GREEN}✓ 服务已停止${NC}"
echo ""

# 2. 卸载旧插件
echo "2. 移除旧插件..."
/root/.nvm/versions/node/v22.22.0/bin/openclaw plugins uninstall wecom 2>/dev/null || true
/root/.nvm/versions/node/v22.22.0/bin/openclaw plugins uninstall clawdbot-wecom 2>/dev/null || true
echo -e "${GREEN}✓ 旧插件已移除${NC}"
echo ""

# 3. 安装新插件
echo "3. 安装新插件（使用正确的 ID）..."
cd /tmp
rm -f clawdbot-wecom-latest.tgz
curl -L https://github.com/GolderBrother/clawdbot-wecom/archive/refs/heads/main.tar.gz -o wecom.tar.gz
mkdir -p wecom-temp
tar -xzf wecom.tar.gz -C wecom-temp --strip-components=1
cd wecom-temp
npm install --silent
tar -czf /tmp/clawdbot-wecom-latest.tgz \
    package.json \
    openclaw.plugin.json \
    index.ts \
    src/ \
    README.md
/root/.nvm/versions/node/v22.22.0/bin/openclaw plugins install clawdbot-wecom --archive /tmp/clawdbot-wecom-latest.tgz
echo -e "${GREEN}✓ 插件已安装${NC}"
echo ""

# 4. 显示配置说明
echo "4. 配置企业微信参数..."
echo -e "${YELLOW}请手动配置以下参数：${NC}"
echo ""
echo "在企业微信后台获取："
echo "  - 企业 ID (corpId)"
echo "  - 应用 Secret (corpSecret)"
echo "  - 应用 AgentId (agentId)"
echo "  - 回调验证 Token (token)"
echo "  - 消息加密密钥 (encodingAESKey)"
echo ""
echo "然后运行以下命令配置："
echo ""
echo "  openclaw config set channels.clawdbot-wecom.corpId \"wwxxxxx\""
echo "  openclaw config set channels.clawdbot-wecom.corpSecret \"your_secret\""
echo "  openclaw config set channels.clawdbot-wecom.agentId 1000001"
echo "  openclaw config set channels.clawdbot-wecom.token \"your_token\""
echo "  openclaw config set channels.clawdbot-wecom.encodingAESKey \"your_aes_key\""
echo "  openclaw config set channels.clawdbot-wecom.enabled true"
echo ""

# 5. 重建并启动服务
echo "5. 重建并启动服务..."
/root/.nvm/versions/node/v22.22.0/bin/openclaw doctor --repair
systemctl --user start openclaw-gateway.service
echo -e "${GREEN}✓ 服务已启动${NC}"
echo ""

# 6. 检查状态
sleep 3
if systemctl --user is-active --quiet openclaw-gateway.service; then
    echo -e "${GREEN}✓ 服务运行正常${NC}"
else
    echo -e "${YELLOW}⚠️  服务状态未知${NC}"
fi

echo ""
echo "=== 修复完成 ==="
echo ""
echo -e "${GREEN}✓ 插件名称: clawdbot-wecom${NC}"
echo -e "${GREEN}✓ 配置路径: channels.clawdbot-wecom${NC}"
echo ""
echo "⚠️  重要提醒："
echo "1. 配置路径是 ${YELLOW}channels.clawdbot-wecom${NC}，不是 channels.wecom"
echo "2. 如果服务器在中国大陆境外，需要迁移到境内服务器"
echo ""
echo "查看状态："
echo "  openclaw status"
echo ""
