#!/bin/bash

# HypeCat HotKey 生产环境部署脚本
# 用途：在服务器上快速部署应用到 popular.hypecat.ai
# 使用方法：chmod +x deploy.sh && ./deploy.sh

set -e  # 遇到错误立即退出

echo "🚀 开始部署 HypeCat HotKey 到生产环境..."

# 配置变量
DOMAIN="popular.hypecat.ai"
APP_DIR="/var/www/hypecat"
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"
EMAIL="your-email@example.com"  # 用于 Let's Encrypt

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}请使用 root 权限运行此脚本${NC}"
    echo "使用方法: sudo ./deploy.sh"
    exit 1
fi

# 1. 安装必要的系统依赖
echo -e "${GREEN}📦 步骤 1/8: 安装系统依赖...${NC}"
apt-get update
apt-get install -y curl git nginx certbot python3-certbot-nginx

# 2. 安装 Node.js (使用 NodeSource)
echo -e "${GREEN}📦 步骤 2/8: 安装 Node.js...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
fi
echo "Node.js 版本: $(node -v)"
echo "npm 版本: $(npm -v)"

# 3. 安装 PM2
echo -e "${GREEN}📦 步骤 3/8: 安装 PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi
echo "PM2 版本: $(pm2 -v)"

# 4. 克隆或更新代码
echo -e "${GREEN}📁 步骤 4/8: 获取应用代码...${NC}"
if [ ! -d "$APP_DIR" ]; then
    echo "克隆代码仓库..."
    git clone https://github.com/QinBenJiaRen/hypeCatHotKey.git $APP_DIR
else
    echo "更新现有代码..."
    cd $APP_DIR
    git pull origin main
fi

# 5. 安装应用依赖
echo -e "${GREEN}📦 步骤 5/8: 安装应用依赖...${NC}"
cd $APP_DIR
npm install --production

# 6. 配置环境变量
echo -e "${GREEN}⚙️  步骤 6/8: 配置环境变量...${NC}"
if [ ! -f "$APP_DIR/.env" ]; then
    echo -e "${YELLOW}创建 .env 文件...${NC}"
    cat > $APP_DIR/.env << EOF
# 生产环境配置 - 请手动填写实际值
NODE_ENV=production

# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Reddit API配置
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
REDDIT_USER_AGENT=HypeCatHotKey/1.0.0

# Reddit OAuth配置
REDDIT_REDIRECT_URI=https://$DOMAIN/auth/reddit/callback
OAUTH_SERVER_PORT=3000

# Twitter API（可选）
TWITTER_BEARER_TOKEN=your_twitter_token_here

# 数据收集配置
COLLECTION_INTERVAL_MINUTES=30
TOP_ITEMS_LIMIT=10
LOG_LEVEL=info
EOF
    echo -e "${YELLOW}⚠️  请编辑 $APP_DIR/.env 文件，填入实际的配置值${NC}"
    echo -e "${YELLOW}编辑完成后，重新运行此脚本继续部署${NC}"
    exit 0
else
    echo "环境变量文件已存在"
fi

# 7. 配置 Nginx
echo -e "${GREEN}🌐 步骤 7/8: 配置 Nginx...${NC}"
if [ ! -f "$NGINX_CONF" ]; then
    echo "创建 Nginx 配置文件..."
    cp $APP_DIR/nginx.conf.example $NGINX_CONF
    
    # 替换域名
    sed -i "s/popular.hypecat.ai/$DOMAIN/g" $NGINX_CONF
    
    # 创建符号链接
    ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
    
    # 测试 Nginx 配置
    nginx -t
    
    echo -e "${YELLOW}⚠️  注意: SSL证书配置行已注释，首次需要先获取证书${NC}"
fi

# 8. 获取 SSL 证书
echo -e "${GREEN}🔒 步骤 8/8: 配置 SSL 证书...${NC}"
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "获取 Let's Encrypt SSL 证书..."
    
    # 临时启动 Nginx（用于验证域名）
    systemctl reload nginx
    
    # 获取证书
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ SSL 证书获取成功${NC}"
    else
        echo -e "${RED}❌ SSL 证书获取失败，请检查域名DNS配置${NC}"
        exit 1
    fi
else
    echo "SSL 证书已存在"
fi

# 创建日志目录
echo -e "${GREEN}📝 创建日志目录...${NC}"
mkdir -p $APP_DIR/logs

# 启动应用
echo -e "${GREEN}🚀 启动应用...${NC}"
cd $APP_DIR
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup

# 重启 Nginx
echo -e "${GREEN}🔄 重启 Nginx...${NC}"
systemctl restart nginx

# 输出部署信息
echo ""
echo -e "${GREEN}✅ 部署完成！${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}📊 部署信息${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "域名: https://$DOMAIN"
echo "应用目录: $APP_DIR"
echo "OAuth服务: https://$DOMAIN"
echo "健康检查: https://$DOMAIN/health"
echo ""
echo -e "${GREEN}🔧 常用命令${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "查看进程状态: pm2 status"
echo "查看日志: pm2 logs"
echo "重启服务: pm2 restart all"
echo "停止服务: pm2 stop all"
echo "更新代码: cd $APP_DIR && git pull && npm install && pm2 restart all"
echo ""
echo -e "${GREEN}📋 下一步${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. 访问 https://$DOMAIN 测试OAuth服务"
echo "2. 在 Reddit 应用设置中添加重定向URI:"
echo "   https://$DOMAIN/auth/reddit/callback"
echo "3. 检查健康状态: curl https://$DOMAIN/health"
echo "4. 查看应用日志: pm2 logs"
echo ""
echo -e "${YELLOW}⚠️  重要提示${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "- 请确保已在 $APP_DIR/.env 中配置正确的API密钥"
echo "- SSL 证书会在到期前自动续期（由 certbot 管理）"
echo "- 建议配置防火墙只开放 80, 443 端口"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""