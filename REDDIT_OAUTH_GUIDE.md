# Reddit OAuth 应用注册指南

## 📋 概述

为了使用Reddit API和OAuth功能，您需要在Reddit上注册一个应用程序。本指南将详细说明如何创建Reddit应用并获取必要的认证信息。

## 🚀 快速开始

### 步骤 1: 访问Reddit应用管理页面

1. 打开浏览器访问: https://www.reddit.com/prefs/apps
2. 使用您的Reddit账号登录

### 步骤 2: 创建新应用

1. 点击页面底部的 **"create another app..."** 按钮
2. 填写应用信息：

#### 📝 应用信息填写

| 字段 | 值 | 说明 |
|------|---|------|
| **name** | `HypeCat HotKey` | 应用名称（可自定义） |
| **App type** | ✅ **web app** | 选择"web app"类型 |
| **description** | `全球热点数据采集应用` | 应用描述（可选） |
| **about url** | `https://github.com/QinBenJiaRen/hypeCatHotKey` | 项目主页（可选） |
| **redirect uri** | `http://localhost:3000/auth/reddit/callback` | 重定向URI（重要！） |

#### ⚠️ 重要注意事项

- **App type** 必须选择 **"web app"**，不要选择"script"
- **redirect uri** 必须准确填写，默认为 `http://localhost:3000/auth/reddit/callback`
- 如果您修改了OAuth服务器端口，请相应调整重定向URI

### 步骤 3: 获取认证信息

创建应用后，您将看到：

```
personal use script
[应用图标] HypeCat HotKey                    edit  delete
                                           
                                           by YourUsername
http://localhost:3000/auth/reddit/callback
```

需要记录的信息：

1. **Client ID**: 应用名称下方的字符串（如：`AbC123dEf456GhI789`）
2. **Client Secret**: 点击应用后显示的"secret"字段

### 步骤 4: 配置环境变量

在项目的 `.env` 文件中配置：

```env
# Reddit API Configuration
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
REDDIT_USER_AGENT=HypeCatHotKey/1.0.0

# Reddit OAuth Configuration
REDDIT_REDIRECT_URI=http://localhost:3000/auth/reddit/callback
OAUTH_SERVER_PORT=3000
```

## 🎯 使用OAuth服务

### 启动OAuth服务器

```bash
# 启动OAuth授权服务器
npm run oauth

# 或者指定端口
node src/oauth-server.js --port 3000
```

### 授权流程

1. **打开浏览器**: 访问 `http://localhost:3000`
2. **开始授权**: 点击"开始Reddit授权"按钮
3. **Reddit登录**: 使用您的Reddit账号登录
4. **授权应用**: 点击"Allow"授权应用访问
5. **完成授权**: 获取访问令牌ID

### 测试API访问

授权成功后，您可以：

1. **查看令牌信息**: `http://localhost:3000/auth/tokens/{token_id}`
2. **测试API访问**: `http://localhost:3000/test/reddit/{token_id}`
3. **健康检查**: `http://localhost:3000/health`

## 🔧 配置说明

### 重定向URI配置

Reddit应用的重定向URI必须与OAuth服务器的设置完全匹配：

| 环境 | 重定向URI | 说明 |
|------|-----------|------|
| **本地开发** | `http://localhost:3000/auth/reddit/callback` | 使用HTTP，端口3000 |
| **自定义端口** | `http://localhost:{PORT}/auth/reddit/callback` | 自定义端口 |

**⭐ 重要提示**：
- Reddit允许配置**多个重定向URI**，建议同时添加开发和生产环境的URI
- 生产环境**必须使用HTTPS**
- URI必须**完全匹配**，包括协议、域名、端口、路径

**Reddit应用配置示例**：
```
在 redirect uri 字段中添加：
http://localhost:3000/auth/reddit/callback
https://popular.hypecat.ai/auth/reddit/callback
```

详细的生产环境部署配置，请参考：[生产环境部署指南](PRODUCTION_DEPLOYMENT.md)

### 环境变量详解

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `REDDIT_CLIENT_ID` | ✅ | Reddit应用的Client ID |
| `REDDIT_CLIENT_SECRET` | ✅ | Reddit应用的Client Secret |
| `REDDIT_USER_AGENT` | ❌ | 用户代理字符串 |
| `REDDIT_REDIRECT_URI` | ❌ | 重定向URI（默认自动生成） |
| `OAUTH_SERVER_PORT` | ❌ | OAuth服务器端口（默认3000） |

## 🛠️ 故障排除

### 常见问题

#### 1. "invalid_client" 错误
```
Reddit OAuth错误: invalid_client
```
**解决方案**:
- 检查 `REDDIT_CLIENT_ID` 是否正确
- 检查 `REDDIT_CLIENT_SECRET` 是否正确
- 确认应用类型选择的是"web app"

#### 2. "redirect_uri_mismatch" 错误
```
Reddit OAuth错误: redirect_uri_mismatch
```
**解决方案**:
- 检查Reddit应用设置中的重定向URI
- 确认环境变量 `REDDIT_REDIRECT_URI` 与应用设置一致
- 确认OAuth服务器端口正确

#### 3. 无法访问OAuth服务器
```
This site can't be reached
```
**解决方案**:
- 确认OAuth服务器已启动：`npm run oauth`
- 检查端口是否被占用
- 确认防火墙设置

#### 4. 授权后无法获取数据
```
Reddit API 调用失败: 401 Unauthorized
```
**解决方案**:
- 检查访问令牌是否过期
- 重新进行OAuth授权
- 确认应用权限范围

### 调试技巧

#### 启用详细日志
```bash
LOG_LEVEL=debug npm run oauth
```

#### 检查应用状态
```bash
curl http://localhost:3000/health
```

#### 手动测试API
```bash
# 获取令牌信息
curl http://localhost:3000/auth/tokens/{token_id}

# 测试API访问
curl http://localhost:3000/test/reddit/{token_id}
```

## 📊 API权限说明

### 请求的权限范围

OAuth授权请求以下权限：

- **read**: 读取公开内容
- **identity**: 获取用户基本信息

### 不会访问的信息

- ❌ 私人消息
- ❌ 投票历史
- ❌ 个人设置
- ❌ 敏感用户数据

## 🔒 安全注意事项

### 保护敏感信息

1. **不要公开分享**:
   - Client Secret
   - 访问令牌
   - 用户数据

2. **安全存储**:
   - 使用环境变量存储密钥
   - 不要提交到版本控制
   - 定期轮换密钥

3. **访问控制**:
   - 限制OAuth服务器访问
   - 使用HTTPS（生产环境）
   - 监控异常访问

## 🚀 生产环境部署

### 域名配置

1. **更新重定向URI**:
   ```
   开发环境：http://localhost:3000/auth/reddit/callback
   ```

2. **环境变量配置**:
   
   **开发环境** (`.env`):
   ```env
   REDDIT_REDIRECT_URI=http://localhost:3000/auth/reddit/callback
   OAUTH_SERVER_PORT=3000
   ```

3. **SSL证书**: 确保HTTPS配置正确（使用Let's Encrypt或其他证书）

4. **Nginx反向代理配置**:
   ```nginx
   server {
       listen 443 ssl http2;
       server_name x;
       
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

📘 **完整部署指南**：查看 [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) 了解详细配置步骤

### 服务器配置

```bash
# 使用PM2管理OAuth服务器
pm2 start src/oauth-server.js --name "reddit-oauth"
pm2 startup
pm2 save
```

## 📞 支持

如果遇到问题：

1. 查看本文档的故障排除部分
2. 检查Reddit API文档：https://www.reddit.com/dev/api/
3. 创建GitHub Issue：https://github.com/QinBenJiaRen/hypeCatHotKey/issues

---

## ✅ 快速检查清单

在开始使用之前，请确认：

- [ ] 已在Reddit上创建"web app"类型应用
- [ ] 获得了Client ID和Client Secret
- [ ] 正确配置了重定向URI
- [ ] 在`.env`文件中设置了所有必要变量
- [ ] OAuth服务器可以正常启动
- [ ] 可以通过浏览器访问授权页面

完成以上步骤后，您就可以使用Reddit OAuth功能了！🎉
