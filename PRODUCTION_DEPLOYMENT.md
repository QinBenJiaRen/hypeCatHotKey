# 生产环境部署配置指南

## 🌐 域名部署配置 (popular.hypecat.ai)

### 📋 配置步骤

#### 1. Reddit应用配置

在 Reddit 开发者控制台 (https://www.reddit.com/prefs/apps) 中：

1. **编辑您的应用**
2. **更新重定向URI**为：
   ```
   https://popular.hypecat.ai/auth/reddit/callback
   ```
3. **保存更改**

**重要提示**：
- ✅ 必须使用 `https://`（生产环境需要SSL）
- ✅ 域名必须完全匹配（包括子域名）
- ✅ 路径必须是 `/auth/reddit/callback`
- ⚠️ 可以同时配置多个重定向URI（开发和生产）

#### 2. 环境变量配置

创建或更新生产环境的 `.env` 文件：

```env
# 生产环境配置
NODE_ENV=production

# Supabase配置（生产环境）
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key

# Reddit API配置
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_USER_AGENT=HypeCatHotKey/1.0.0

# 生产环境OAuth配置 ⭐ 重要
REDDIT_REDIRECT_URI=https://popular.hypecat.ai/auth/reddit/callback
OAUTH_SERVER_PORT=443

# Twitter API（如果使用）
TWITTER_BEARER_TOKEN=your_twitter_token

# 数据收集配置
COLLECTION_INTERVAL_MINUTES=30
TOP_ITEMS_LIMIT=10
LOG_LEVEL=info
```

#### 3. 服务器配置

##### 方式A: 使用反向代理（推荐）

**Nginx配置示例**：

```nginx
# /etc/nginx/sites-available/popular.hypecat.ai

server {
    listen 80;
    server_name popular.hypecat.ai;
    
    # 重定向HTTP到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name popular.hypecat.ai;

    # SSL证书配置
    ssl_certificate /etc/letsencrypt/live/popular.hypecat.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/popular.hypecat.ai/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # 日志配置
    access_log /var/log/nginx/hypecat-oauth-access.log;
    error_log /var/log/nginx/hypecat-oauth-error.log;

    # OAuth服务器代理
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**启用Nginx配置**：
```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/popular.hypecat.ai /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

##### 方式B: 直接监听443端口

**环境变量配置**：
```env
OAUTH_SERVER_PORT=443
```

**注意**：需要root权限或使用端口转发。

#### 4. SSL证书配置

**使用Let's Encrypt获取免费SSL证书**：

```bash
# 安装Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d popular.hypecat.ai

# 自动续期（Certbot会自动配置）
sudo certbot renew --dry-run
```

#### 5. 应用代码配置

**无需修改代码**！应用会自动从环境变量读取配置：

```javascript
// src/services/redditOAuthService.js
// 已经支持动态读取环境变量
this.redirectUri = process.env.REDDIT_REDIRECT_URI || 
                   `http://localhost:${this.port}/auth/reddit/callback`;
```

#### 6. 启动服务

**使用PM2管理进程**（推荐）：

```bash
# 安装PM2
npm install -g pm2

# 启动OAuth服务器
pm2 start src/oauth-server.js --name "hypecat-oauth" --env production

# 启动主应用（可选）
pm2 start src/main.js --name "hypecat-collector" --env production

# 保存配置
pm2 save

# 设置开机自启
pm2 startup
```

**PM2配置文件** (`ecosystem.config.cjs`):

```javascript
module.exports = {
  apps: [
    {
      name: 'hypecat-oauth',
      script: './src/oauth-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        OAUTH_SERVER_PORT: 3000,
      },
      error_file: './logs/oauth-error.log',
      out_file: './logs/oauth-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'hypecat-collector',
      script: './src/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/collector-error.log',
      out_file: './logs/collector-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
```

使用配置文件启动：
```bash
pm2 start ecosystem.config.cjs
```

## 🔄 多环境配置

### 同时支持开发和生产环境

在Reddit应用中添加**多个重定向URI**：

```
http://localhost:3000/auth/reddit/callback        (开发环境)
https://popular.hypecat.ai/auth/reddit/callback   (生产环境)
```

### 环境变量管理

**开发环境** (`.env.development`):
```env
NODE_ENV=development
REDDIT_REDIRECT_URI=http://localhost:3000/auth/reddit/callback
OAUTH_SERVER_PORT=3000
```

**生产环境** (`.env.production`):
```env
NODE_ENV=production
REDDIT_REDIRECT_URI=https://popular.hypecat.ai/auth/reddit/callback
OAUTH_SERVER_PORT=3000
```

**启动时指定环境**：
```bash
# 开发环境
NODE_ENV=development npm run oauth

# 生产环境
NODE_ENV=production npm run oauth
```

## 🔒 安全配置清单

### 生产环境安全要点

- [ ] ✅ 使用HTTPS（必需）
- [ ] ✅ 配置SSL证书
- [ ] ✅ 设置正确的CORS策略
- [ ] ✅ 使用环境变量存储敏感信息
- [ ] ✅ 启用防火墙
- [ ] ✅ 定期更新依赖包
- [ ] ✅ 配置日志轮转
- [ ] ✅ 监控服务状态

### CORS配置更新

生产环境需要更新CORS配置：

```javascript
// src/services/redditOAuthService.js
setupMiddleware() {
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? ['https://popular.hypecat.ai']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];
    
  this.app.use(cors({
    origin: allowedOrigins,
    credentials: true
  }));
}
```

## 📊 监控和日志

### 1. PM2监控

```bash
# 查看进程状态
pm2 status

# 查看日志
pm2 logs hypecat-oauth

# 监控面板
pm2 monit

# 重启服务
pm2 restart hypecat-oauth
```

### 2. Nginx访问日志

```bash
# 实时查看访问日志
tail -f /var/log/nginx/hypecat-oauth-access.log

# 查看错误日志
tail -f /var/log/nginx/hypecat-oauth-error.log
```

### 3. 应用日志

```bash
# 应用日志位置
./logs/oauth-error.log
./logs/oauth-out.log
```

## 🧪 测试生产环境

### 1. 本地测试HTTPS

使用`ngrok`或`localtunnel`测试：

```bash
# 使用ngrok
ngrok http 3000

# 获得临时域名，如：https://abc123.ngrok.io
# 在Reddit应用中添加：https://abc123.ngrok.io/auth/reddit/callback
```

### 2. 健康检查

```bash
# 检查服务状态
curl https://popular.hypecat.ai/health

# 预期响应
{
  "status": "ok",
  "timestamp": "2025-10-28T...",
  "activeTokens": 0,
  "pendingStates": 0
}
```

### 3. OAuth流程测试

1. 访问: https://popular.hypecat.ai
2. 点击"开始Reddit授权"
3. 完成Reddit登录和授权
4. 验证重定向回: https://popular.hypecat.ai/auth/reddit/callback
5. 查看授权成功页面

## 🚨 常见问题

### 1. 重定向URI不匹配

**错误信息**：
```
redirect_uri_mismatch
```

**解决方案**：
- 确认Reddit应用中的URI完全匹配
- 检查是否使用HTTPS
- 验证域名拼写正确

### 2. SSL证书错误

**错误信息**：
```
ERR_CERT_COMMON_NAME_INVALID
```

**解决方案**：
- 确认SSL证书包含正确的域名
- 使用Let's Encrypt重新生成证书
- 检查证书是否过期

### 3. 服务器端口占用

**错误信息**：
```
Error: listen EADDRINUSE: address already in use :::443
```

**解决方案**：
```bash
# 查找占用端口的进程
sudo lsof -i :443

# 停止占用的进程
sudo kill -9 <PID>
```

## 📝 部署检查清单

完整的生产环境部署检查：

### Reddit配置
- [ ] 在Reddit应用中添加生产环境重定向URI
- [ ] 验证Client ID和Secret正确
- [ ] 测试OAuth授权流程

### 服务器配置
- [ ] 域名DNS解析正确指向服务器
- [ ] SSL证书安装并配置
- [ ] Nginx反向代理配置
- [ ] 防火墙规则配置（开放80、443端口）

### 应用配置
- [ ] 生产环境.env文件配置
- [ ] REDDIT_REDIRECT_URI设置为生产域名
- [ ] 日志目录创建并有写入权限
- [ ] PM2进程管理配置

### 安全配置
- [ ] HTTPS强制启用
- [ ] 敏感信息使用环境变量
- [ ] CORS策略配置正确
- [ ] 日志轮转配置

### 测试验证
- [ ] 健康检查API正常响应
- [ ] OAuth授权流程测试通过
- [ ] Reddit API访问测试成功
- [ ] 日志记录正常

## 🔄 更新和维护

### 1. 更新应用

```bash
# 拉取最新代码
git pull origin main

# 安装依赖
npm install

# 重启服务
pm2 restart all
```

### 2. 更新SSL证书

```bash
# Let's Encrypt自动续期
sudo certbot renew

# 重启Nginx
sudo systemctl reload nginx
```

### 3. 备份配置

```bash
# 备份环境变量
cp .env .env.backup.$(date +%Y%m%d)

# 备份Nginx配置
sudo cp /etc/nginx/sites-available/popular.hypecat.ai \
        /etc/nginx/sites-available/popular.hypecat.ai.backup.$(date +%Y%m%d)
```

## 🎯 快速参考

### 生产环境重定向URI
```
https://popular.hypecat.ai/auth/reddit/callback
```

### 关键环境变量
```env
REDDIT_REDIRECT_URI=https://popular.hypecat.ai/auth/reddit/callback
OAUTH_SERVER_PORT=3000  # Nginx代理
NODE_ENV=production
```

### 访问地址
- 主页: https://popular.hypecat.ai
- 健康检查: https://popular.hypecat.ai/health
- 开始授权: https://popular.hypecat.ai/auth/reddit

---

按照以上步骤配置后，您的OAuth服务就可以在 `popular.hypecat.ai` 域名下正常运行了！🚀