# Reddit OAuth 服务演示

## 🎯 OAuth服务功能展示

### 🌐 Web界面预览

#### 1. 主页 (`http://localhost:3000`)
```html
╔══════════════════════════════════════════════════════════════╗
║                    🐱 HypeCat HotKey                        ║
║                  Reddit OAuth 授权服务                       ║
╠══════════════════════════════════════════════════════════════╣
║ 📋 授权说明                                                  ║
║   1. 点击下方按钮开始授权流程                                ║
║   2. 登录您的Reddit账号                                      ║
║   3. 授权应用访问您的基本信息                                ║
║   4. 完成后返回获取API访问令牌                               ║
║                                                              ║
║                  🚀 开始Reddit授权                           ║
║                                                              ║
║ 🔒 隐私说明                                                  ║
║ 本应用仅请求基本的读取权限，不会访问您的私人信息...          ║
╚══════════════════════════════════════════════════════════════╝
```

#### 2. 授权成功页面
```html
✅ Reddit OAuth 授权成功！

用户信息:
- 用户名: your_reddit_username
- 用户ID: t2_xxxxxxx
- 创建时间: 2020-01-15 10:30:45

🔑 访问令牌ID: abc123def456ghi789

[🧪 测试API访问]  [📋 查看令牌信息]  [🏠 返回首页]

📝 配置信息:
现在您可以使用以下配置信息更新您的 .env 文件：
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_REDIRECT_URI=http://localhost:3000/auth/reddit/callback
```

### 🔧 API端点功能

#### 1. 健康检查
```bash
GET /health
```
**响应示例**:
```json
{
  "status": "ok",
  "timestamp": "2025-10-21T15:54:02.123Z",
  "activeTokens": 1,
  "pendingStates": 0
}
```

#### 2. 获取令牌信息
```bash
GET /auth/tokens/{tokenId}
```
**响应示例**:
```json
{
  "userInfo": {
    "name": "your_username",
    "id": "t2_xxxxxxx",
    "created_utc": 1579089045
  },
  "scope": "read identity",
  "timestamp": 1729518842123,
  "expires_in": 3600
}
```

#### 3. 测试API访问
```bash
GET /test/reddit/{tokenId}
```
**响应示例**:
```json
{
  "success": true,
  "message": "Reddit API访问成功",
  "userInfo": {
    "name": "your_username",
    "id": "t2_xxxxxxx"
  },
  "sampleData": [
    {
      "title": "TIL that octopuses have three hearts",
      "score": 15420,
      "subreddit": "todayilearned",
      "url": "https://en.wikipedia.org/wiki/Octopus"
    },
    {
      "title": "My cat discovered the printer",
      "score": 8934,
      "subreddit": "funny",
      "url": "https://i.redd.it/abc123.jpg"
    }
  ]
}
```

## 🚀 使用演示

### 启动OAuth服务器

```bash
# 方式1: 使用npm脚本
npm run oauth

# 方式2: 直接运行
node src/oauth-server.js

# 方式3: 指定端口
node src/oauth-server.js --port 8080
```

**启动输出**:
```
[2025-10-21 15:54:02] INFO  🚀 启动Reddit OAuth服务器...
[2025-10-21 15:54:02] INFO  ✅ 环境变量检查通过
[2025-10-21 15:54:02] INFO  🌐 Reddit OAuth服务器启动成功: http://localhost:3000
[2025-10-21 15:54:02] INFO  📋 重定向URI: http://localhost:3000/auth/reddit/callback
[2025-10-21 15:54:02] INFO  🔗 开始授权: http://localhost:3000/auth/reddit

╔══════════════════════════════════════════════════════════════╗
║                  Reddit OAuth 授权服务                       ║
║                    HypeCat HotKey v1.0.0                    ║
╠══════════════════════════════════════════════════════════════╣
║ 服务器地址: http://localhost:3000                           ║
║ 重定向URI: http://localhost:3000/auth/reddit/callback       ║
╠══════════════════════════════════════════════════════════════╣
║ 快速开始:                                                    ║
║   1. 打开浏览器访问: http://localhost:3000                  ║
║   2. 点击"开始Reddit授权"按钮                                ║
║   3. 登录Reddit账号并授权                                    ║
║   4. 获取访问令牌用于API调用                                 ║
╚══════════════════════════════════════════════════════════════╝
```

### 授权流程演示

#### 步骤1: 访问主页
```bash
# 浏览器访问
http://localhost:3000
```

#### 步骤2: 开始授权
点击"开始Reddit授权"按钮，自动跳转到：
```
https://www.reddit.com/api/v1/authorize?
  client_id=your_client_id&
  response_type=code&
  state=abc123def456&
  redirect_uri=http://localhost:3000/auth/reddit/callback&
  duration=temporary&
  scope=read%20identity
```

#### 步骤3: Reddit授权页面
用户在Reddit上看到：
```
HypeCat HotKey wants to:
☑️ Read your reddit content and settings
☑️ Access your reddit username and signup date

[Decline]  [Allow]
```

#### 步骤4: 授权回调
用户点击"Allow"后，Reddit重定向到：
```
http://localhost:3000/auth/reddit/callback?
  code=authorization_code_here&
  state=abc123def456
```

#### 步骤5: 令牌交换
服务器自动：
1. 验证state参数
2. 使用authorization_code换取access_token
3. 获取用户信息
4. 显示成功页面

### 集成到主应用

#### 1. 在数据收集服务中使用OAuth令牌

```javascript
// src/services/dataCollectorService.js 示例
import RedditOAuthService from './redditOAuthService.js';

class DataCollectorService {
  constructor() {
    // ... 其他初始化
    this.oauthService = new RedditOAuthService();
  }

  async collectRedditData() {
    // 获取OAuth访问令牌
    const oauthToken = this.oauthService.getValidAccessToken();
    
    if (oauthToken) {
      // 设置OAuth令牌到Reddit服务
      this.redditService.setOAuthToken(oauthToken);
      console.log('✅ 使用OAuth令牌访问Reddit API');
    } else {
      console.log('⚠️ 未找到有效的OAuth令牌，使用应用级认证');
    }
    
    // 正常收集数据
    return await this.redditService.getAllHotPosts();
  }
}
```

#### 2. 启动集成服务

```javascript
// 同时运行OAuth服务器和数据收集
import HypeCatHotKeyApp from './main.js';
import RedditOAuthService from './services/redditOAuthService.js';

async function startIntegratedService() {
  // 启动OAuth服务器
  const oauthService = new RedditOAuthService();
  await oauthService.start();
  
  // 启动主应用
  const app = new HypeCatHotKeyApp();
  await app.start();
  
  console.log('🎉 集成服务启动完成！');
  console.log('🌐 OAuth授权: http://localhost:3000');
  console.log('📊 数据收集: 后台运行中...');
}
```

## 🧪 测试场景

### 场景1: 完整授权流程测试

```bash
# 1. 启动OAuth服务器
npm run oauth

# 2. 浏览器访问
# http://localhost:3000

# 3. 点击授权按钮
# 4. 在Reddit上登录并授权
# 5. 查看成功页面和令牌ID
```

### 场景2: API测试

```bash
# 使用curl测试健康检查
curl http://localhost:3000/health

# 测试令牌信息（替换实际token_id）
curl http://localhost:3000/auth/tokens/abc123def456

# 测试Reddit API访问
curl http://localhost:3000/test/reddit/abc123def456
```

### 场景3: 错误处理测试

```bash
# 测试无效令牌
curl http://localhost:3000/auth/tokens/invalid_token
# 预期: 404 错误

# 测试未配置环境变量启动
REDDIT_CLIENT_ID= node src/oauth-server.js
# 预期: 配置错误退出
```

## 📊 性能和监控

### 内存使用情况

```javascript
// OAuth服务器内置监控
{
  "activeTokens": 3,      // 当前活跃令牌数
  "pendingStates": 1,     // 待验证的授权状态数
  "uptime": "2h 15m",     // 运行时间
  "memoryUsage": "45MB"   // 内存使用
}
```

### 自动清理机制

- **状态清理**: 10分钟后清理过期的授权状态
- **令牌清理**: 1小时后清理过期的访问令牌
- **清理间隔**: 每5分钟执行一次清理

## 🔒 安全特性

### 1. State参数验证
- 防止CSRF攻击
- 每次授权生成唯一state
- 验证后立即删除

### 2. 令牌安全
- 访问令牌不在日志中显示
- 自动过期机制
- 内存存储（重启后清除）

### 3. 请求验证
- User-Agent验证
- 重定向URI验证
- 客户端认证

## 🎉 成功标志

当您看到以下内容时，表示OAuth服务设置成功：

✅ **服务器启动成功**
```
🌐 Reddit OAuth服务器启动成功: http://localhost:3000
```

✅ **授权成功**
```
✅ Reddit OAuth授权成功: your_username
```

✅ **API测试成功**
```json
{
  "success": true,
  "message": "Reddit API访问成功"
}
```

✅ **数据收集集成**
```
✅ 使用OAuth令牌访问Reddit API
🤖 Reddit: 收集到 10 条数据
```

现在您已经拥有了一个完整的Reddit OAuth授权服务！🚀