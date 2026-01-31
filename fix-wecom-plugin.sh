#!/bin/bash
# 企业微信插件修复脚本
# 用于修复插件 ID 不匹配、网关服务问题，并配置企业微信

set -e

echo "=== 企业微信插件修复脚本 ==="
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

echo "2. 安装系统级 Node.js 22.x..."
if ! command -v node &> /dev/null; then
    # 检测系统类型
    if [ -f /etc/redhat-release ]; then
        # CentOS/RHEL
        echo "检测到 CentOS/RHEL 系统"
        curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
        sudo yum install -y nodejs
    elif [ -f /etc/debian_version ]; then
        # Debian/Ubuntu
        echo "检测到 Debian/Ubuntu 系统"
        curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
        sudo apt-get install -y nodejs
    else
        echo -e "${RED}不支持的系统${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Node.js $(node -v) 已安装${NC}"
else
    echo -e "${YELLOW}Node.js $(node -v) 已存在${NC}"
fi
echo ""

echo "3. 重新创建插件包..."
cd /tmp
rm -f wecom-latest.tgz

# 从 GitHub 获取最新版本
echo "正在从 GitHub 下载插件..."
curl -L https://github.com/GolderBrother/clawdbot-wecom/archive/refs/heads/main.tar.gz -o wecom-main.tar.gz
mkdir -p wecom-tmp
tar -xzf wecom-main.tar.gz -C wecom-tmp
cd wecom-tmp/clawdbot-wecom-main

# 安装依赖
npm install

# 创建插件包
echo "创建插件包..."
tar -czf /tmp/wecom-latest.tgz \
    --transform='s,^,clawdbot-wecom/,' \
    package.json \
    openclaw.plugin.json \
    index.ts \
    src/ \
    README.md

echo -e "${GREEN}✓ 插件包创建完成: /tmp/wecom-latest.tgz${NC}"
echo ""

echo "4. 备份当前配置..."
if [ -f "/root/.openclaw/openclaw.json" ]; then
    cp /root/.openclaw/openclaw.json /root/.openclaw/openclaw.json.backup.$(date +%Y%m%d_%H%M%S)
    echo -e "${GREEN}✓ 配置已备份${NC}"
fi
echo ""

echo "5. 更新插件配置..."
# 使用 openclaw CLI 重新安装插件
/root/.nvm/versions/node/v22.22.0/bin/openclaw plugins install --replace wecom --archive /tmp/wecom-latest.tgz
echo -e "${GREEN}✓ 插件已重新安装${NC}"
echo ""

echo "6. 配置企业微信参数..."
read -p "请输入企业 ID (corpId): " CORP_ID
read -p "请输入应用 Secret (corpSecret): " CORP_SECRET
read -p "请输入应用 AgentId: " AGENT_ID
read -p "请输入回调验证 Token: " TOKEN
read -p "请输入消息加密密钥 (encodingAESKey): " ENCODING_KEY

# 更新配置
/root/.nvm/versions/node/v22.22.0/bin/openclaw config set channels.wecom.corpId "$CORP_ID"
/root/.nvm/versions/node/v22.22.0/bin/openclaw config set channels.wecom.corpSecret "$CORP_SECRET"
/root/.nvm/versions/node/v22.22.0/bin/openclaw config set channels.wecom.agentId "$AGENT_ID"
/root/.nvm/versions/node/v22.22.0/bin/openclaw config set channels.wecom.token "$TOKEN"
/root/.nvm/versions/node/v22.22.0/bin/openclaw config set channels.wecom.encodingAESKey "$ENCODING_KEY"
/root/.nvm/versions/node/v22.22.0/bin/openclaw config set channels.wecom.webhookPath "/wecom/events"
/root/.nvm/versions/node/v22.22.0/bin/openclaw config set channels.wecom.webhookPort 18789
/root/.nvm/versions/node/v22.22.0/bin/openclaw config set channels.wecom.enabled true

echo -e "${GREEN}✓ 企业微信配置已更新${NC}"
echo ""

echo "7. 重建服务..."
/root/.nvm/versions/node/v22.22.0/bin/openclaw doctor --repair
echo -e "${GREEN}✓ 服务已重建${NC}"
echo ""

echo "8. 启动 OpenClaw 服务..."
systemctl --user start openclaw-gateway.service
echo -e "${GREEN}✓ 服务已启动${NC}"
echo ""

echo "9. 等待服务启动..."
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
    echo "  openclaw status"
    exit 1
fi

# 检查端口
if netstat -tuln | grep -q ":18789 "; then
    echo -e "${GREEN}✓ 端口 18789 正在监听${NC}"
else
    echo -e "${RED}✗ 端口 18789 未监听${NC}"
    exit 1
fi

echo ""
echo "=== 修复完成 ==="
echo ""
echo "服务器信息："
echo "  公网 IP: $(curl -s ifconfig.me)"
echo "  端口: 18789"
echo "  Webhook 路径: /wecom/events"
echo ""
echo "企业微信配置 URL："
echo -e "${GREEN}  http://$(curl -s ifconfig.me):18789/wecom/events${NC}"
echo ""
echo -e "${YELLOW}⚠️  重要提示：${NC}"
echo "1. 如果你的服务器在中国大陆境外（如美国、硅谷），企业微信无法访问！"
echo "2. 需要将服务迁移到中国大陆（阿里云、腾讯云等）"
echo "3. 或使用境内服务器作为代理"
echo ""
echo "下一步："
echo "1. 将上述 URL 配置到企业微信后台的'接收消息服务器配置'"
echo "2. 确保 Token 和 encodingAESKey 与企业微信后台一致"
echo "3. 点击保存并等待验证"
echo ""
echo "查看状态："
echo "  openclaw status"
echo ""
echo "查看日志："
echo "  journalctl --user -u openclaw-gateway.service -f"
