# Vercel 部署指南

## 📋 目录

- [部署前准备](#部署前准备)
- [快速部署](#快速部署)
- [环境变量配置](#环境变量配置)
- [Vercel Cron配置](#vercel-cron配置)
- [域名配置](#域名配置)
- [与传统部署的区别](#与传统部署的区别)
- [常见问题](#常见问题)

## 🚀 部署前准备

### 1. Vercel账号
- 注册Vercel账号: https://vercel.com/signup
- 关联GitHub账号（推荐）

### 2. 准备API密钥
需要以下API凭证：
- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`
- **Reddit API**: `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USER_AGENT`
- **Twitter API**（可选）: `TWITTER_BEARER_TOKEN`

### 3. Reddit应用配置
在 https://www.reddit.com/prefs/apps 配置重定向URI：
```
https://your-project.vercel.app/auth/reddit/callback
```

## 🎯 快速部署

### 方法一：通过GitHub部署（推荐）

1. **推送代码到GitHub**
   ```bash
   git add .
   git commit -m "Add Vercel support"
   git push origin main
   ```

2. **导入到Vercel**
   - 访问 https://vercel.com/new
   - 选择你的GitHub仓库
   - 点击 "Import"

3. **配置环境变量**（见下文）

4. **部署**
   - 点击 "Deploy"
   - 等待构建完成（通常1-2分钟）

### 方法二：通过Vercel CLI部署

1. **安装Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **登录Vercel**
   ```bash
   vercel login
   ```

3. **部署到生产环境**
   ```bash
   vercel --prod
   ```

## ⚙️ 环境变量配置

在Vercel项目设置中添加以下环境变量：

### 必需的环境变量

```env
# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Reddit API配置
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
REDDIT_USER_AGENT=HypeCatHotKey/1.0.0 by YourRedditUsername

# Reddit OAuth配置
REDDIT_REDIRECT_URI=https://your-project.vercel.app/auth/reddit/callback

# Node环境
NODE_ENV=production
```

### 可选的环境变量

```env
# Twitter API（可选）
TWITTER_BEARER_TOKEN=your_twitter_bearer_token

# Cron安全密钥（可选，用于保护Cron端点）
CRON_SECRET=your_random_secret_key
```

### 配置步骤

1. 进入Vercel项目 → Settings → Environment Variables
2. 添加每个环境变量：
   - **Key**: 变量名（如 `REDDIT_CLIENT_ID`）
   - **Value**: 变量值
   - **Environment**: 选择 `Production`, `Preview`, `Development`（根据需要）
3. 点击 "Save"

## ⏰ Vercel Cron配置

### Cron任务说明

Vercel Cron允许定时执行Serverless函数。本项目配置为每30分钟自动收集数据。

### vercel.json配置

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

### Cron时间表达式说明

- `*/30 * * * *` - 每30分钟执行一次
- `0 */1 * * *` - 每小时执行一次
- `0 0 * * *` - 每天午夜执行一次
- `0 9 * * 1` - 每周一上午9点执行

### Cron限制（Vercel Hobby计划）

- **频率限制**: 最短1分钟
- **执行时长**: 最长60秒（Hobby）/ 900秒（Pro）
- **并发限制**: 1个并发执行

⚠️ **重要**: Vercel Cron仅在 **Pro** 或 **Enterprise** 计划中可用！

### Hobby计划替代方案

如果使用Vercel Hobby（免费）计划，推荐使用外部Cron服务：

#### 选项1: Cron-job.org
1. 注册 https://cron-job.org
2. 创建新任务，URL设置为:
   ```
   https://your-project.vercel.app/api/collect
   ```
3. 设置执行频率（如每30分钟）

#### 选项2: EasyCron
1. 注册 https://www.easycron.com
2. 创建新任务指向你的API端点

#### 选项3: GitHub Actions
创建 `.github/workflows/cron.yml`:
```yaml
name: Scheduled Data Collection
on:
  schedule:
    - cron: '*/30 * * * *'
  workflow_dispatch:

jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger data collection
        run: |
          curl -X POST https://your-project.vercel.app/api/collect
```

## 🌐 域名配置

### 使用Vercel默认域名
部署后自动获得域名：
```
https://your-project.vercel.app
```

### 配置自定义域名

1. **添加域名**
   - Vercel项目 → Settings → Domains
   - 输入域名（如 `popular.hypecat.ai`）
   - 点击 "Add"

2. **配置DNS记录**
   
   **选项A - CNAME记录（推荐）**:
   ```
   类型: CNAME
   名称: popular (或 @)
   值: cname.vercel-dns.com
   ```

   **选项B - A记录**:
   ```
   类型: A
   名称: @ (或 popular)
   值: 76.76.21.21
   ```

3. **更新Reddit重定向URI**
   在 https://www.reddit.com/prefs/apps 更新为：
   ```
   https://popular.hypecat.ai/auth/reddit/callback
   ```

4. **更新环境变量**
   ```env
   REDDIT_REDIRECT_URI=https://popular.hypecat.ai/auth/reddit/callback
   ```

### SSL证书
Vercel自动为所有域名提供免费SSL证书（Let's Encrypt）。

## 🔄 与传统部署的区别

### 架构差异

| 特性 | 传统部署 (PM2/Nginx) | Vercel |
|------|---------------------|--------|
| **服务器** | 需要VPS/服务器 | 无需管理服务器 |
| **扩展性** | 手动配置 | 自动扩展 |
| **SSL** | 需手动配置 | 自动提供 |
| **成本** | 固定服务器费用 | 按使用量付费 |
| **部署** | SSH + 命令行 | Git push |
| **定时任务** | node-cron / crontab | Vercel Cron / 外部服务 |

### 代码结构差异

**传统部署**:
```
src/
├── main.js              # Express服务器
├── oauth-server.js      # OAuth服务器
└── services/            # 各种服务
```

**Vercel部署**:
```
api/
├── index.js             # 主页 (/)
├── health.js            # 健康检查 (/health)
├── collect.js           # 数据收集 (/api/collect)
├── cron.js              # 定时任务 (/api/cron)
└── auth/
    ├── reddit.js        # OAuth入口
    └── callback.js      # OAuth回调
```

### 注意事项

❌ **Vercel不支持**:
- 长时间运行的进程（超过执行时间限制）
- WebSocket持久连接
- 文件系统写入（临时文件除外）
- 本地状态存储（每次请求都是新环境）

✅ **Vercel最适合**:
- API端点
- Serverless函数
- 静态站点
- 短时间运行的任务

## 🛠️ API端点

部署后可用的端点：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/` | GET | 应用主页 |
| `/health` | GET | 健康检查 |
| `/auth/reddit` | GET | Reddit OAuth授权 |
| `/auth/reddit/callback` | GET | OAuth回调 |
| `/api/collect` | GET/POST | 手动触发数据收集 |
| `/api/cron` | GET/POST | Cron任务端点 |

## 🐛 常见问题

### 1. 部署失败

**问题**: Build失败
```
Error: Cannot find module 'xxx'
```

**解决**:
```bash
# 确保所有依赖在 package.json 中
npm install --save axios @supabase/supabase-js
```

### 2. 环境变量未生效

**问题**: API返回 "Missing configuration"

**解决**:
1. 检查Vercel项目设置中环境变量是否正确
2. 重新部署: `vercel --prod` 或 Git push
3. 环境变量更新后需要重新部署

### 3. Reddit OAuth失败

**问题**: Redirect URI不匹配

**解决**:
1. 确保Reddit应用中的URI与Vercel域名完全匹配
2. 包含协议（https://）
3. 包含完整路径（/auth/reddit/callback）
4. 更新 `REDDIT_REDIRECT_URI` 环境变量

### 4. Cron任务不执行

**问题**: 定时任务没有运行

**解决**:
- **Hobby计划**: Cron不可用，使用外部服务
- **Pro计划**: 检查Vercel仪表板中的Cron日志
- 验证 `vercel.json` 配置正确

### 5. 函数执行超时

**问题**: Error: Function execution timeout

**解决**:
```json
// vercel.json
{
  "functions": {
    "api/**/*.js": {
      "maxDuration": 60  // Hobby: 最大10秒, Pro: 最大60秒
    }
  }
}
```

### 6. 数据库连接失败

**问题**: Supabase连接错误

**解决**:
1. 检查Supabase URL和Key是否正确
2. 确保Supabase项目未暂停
3. 检查网络访问限制（Vercel IP白名单）

## 📊 监控和日志

### 查看日志

1. **Vercel仪表板**
   - 项目 → Deployments → 选择部署 → Functions
   - 查看实时日志

2. **通过CLI**
   ```bash
   vercel logs
   vercel logs --follow  # 实时日志
   ```

### 监控指标

Vercel提供以下指标（Pro计划）:
- 请求数量
- 执行时长
- 带宽使用
- 错误率

## 🎉 部署完成

部署成功后：

1. **测试OAuth**
   ```
   https://your-project.vercel.app/auth/reddit
   ```

2. **测试健康检查**
   ```
   https://your-project.vercel.app/health
   ```

3. **手动触发数据收集**
   ```
   https://your-project.vercel.app/api/collect
   ```

## 📚 相关资源

- [Vercel文档](https://vercel.com/docs)
- [Vercel CLI文档](https://vercel.com/docs/cli)
- [Vercel Cron文档](https://vercel.com/docs/cron-jobs)
- [Serverless Functions文档](https://vercel.com/docs/functions/serverless-functions)

---

如有问题，请查看 [Vercel帮助中心](https://vercel.com/help) 或创建 [Issue](https://github.com/QinBenJiaRen/hypeCatHotKey/issues)。
