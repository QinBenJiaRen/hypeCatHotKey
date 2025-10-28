# Vercel快速部署清单

## ✅ 部署前检查

### 1. 准备API凭证
- [ ] Supabase账号和项目
- [ ] Reddit应用（Client ID + Secret）
- [ ] Twitter API Token（可选）

### 2. 获取Supabase配置
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
```

### 3. 创建Reddit应用
1. 访问 https://www.reddit.com/prefs/apps
2. 点击 "create another app..."
3. 选择 "web app"
4. 填写信息:
   - name: HypeCat HotKey
   - redirect uri: https://your-project.vercel.app/auth/reddit/callback
5. 获取 Client ID 和 Client Secret

## 🚀 部署步骤

### 方法1: 一键部署（最简单）

1. **点击部署按钮**
   
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/QinBenJiaRen/hypeCatHotKey)

2. **配置环境变量**
   
   在Vercel部署页面添加：
   ```
   NEXT_PUBLIC_SUPABASE_URL=你的URL
   SUPABASE_SERVICE_ROLE_KEY=你的密钥
   REDDIT_CLIENT_ID=你的ClientID
   REDDIT_CLIENT_SECRET=你的Secret
   REDDIT_USER_AGENT=HypeCatHotKey/1.0.0 by 你的用户名
   REDDIT_REDIRECT_URI=https://你的项目.vercel.app/auth/reddit/callback
   NODE_ENV=production
   ```

3. **点击Deploy**

4. **等待构建完成**（约1-2分钟）

### 方法2: GitHub导入

1. **Fork仓库**
   ```bash
   # 或克隆到自己的GitHub账号
   ```

2. **导入到Vercel**
   - 访问 https://vercel.com/new
   - 选择你的GitHub仓库
   - 点击 Import

3. **配置环境变量**（同上）

4. **部署**

### 方法3: CLI部署

1. **安装Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **登录**
   ```bash
   vercel login
   ```

3. **部署**
   ```bash
   vercel --prod
   ```

4. **在浏览器中配置环境变量**

## ⚙️ 环境变量配置

在Vercel项目设置中（Settings → Environment Variables）添加：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | https://xxx.supabase.co | Supabase项目URL |
| `SUPABASE_SERVICE_ROLE_KEY` | eyJhbG... | Supabase服务密钥 |
| `REDDIT_CLIENT_ID` | aBc123... | Reddit应用ID |
| `REDDIT_CLIENT_SECRET` | XyZ789... | Reddit应用密钥 |
| `REDDIT_USER_AGENT` | HypeCat/1.0 by username | User Agent |
| `REDDIT_REDIRECT_URI` | https://项目.vercel.app/auth/reddit/callback | 回调URI |
| `NODE_ENV` | production | 环境标识 |

**可选变量**：
- `TWITTER_BEARER_TOKEN` - Twitter API令牌
- `CRON_SECRET` - Cron端点保护密钥

## 🔧 部署后配置

### 1. 获取部署URL
```
https://your-project.vercel.app
```

### 2. 更新Reddit重定向URI
1. 访问 https://www.reddit.com/prefs/apps
2. 编辑你的应用
3. 更新 redirect uri 为:
   ```
   https://your-project.vercel.app/auth/reddit/callback
   ```
4. 保存

### 3. 测试功能

**测试OAuth**:
```
https://your-project.vercel.app/auth/reddit
```

**测试健康检查**:
```
https://your-project.vercel.app/health
```

**手动收集数据**:
```
https://your-project.vercel.app/api/collect
```

## ⏰ Cron配置（可选）

### Pro计划用户
Cron已在 `vercel.json` 中配置，自动每30分钟运行。

### Hobby（免费）计划用户
使用外部Cron服务：

**选项1: Cron-job.org**
1. 注册 https://cron-job.org
2. 创建新任务:
   - URL: `https://your-project.vercel.app/api/collect`
   - 频率: 每30分钟

**选项2: EasyCron**
1. 注册 https://www.easycron.com
2. 添加任务指向你的API

**选项3: GitHub Actions**
在仓库添加 `.github/workflows/cron.yml`:
```yaml
name: Data Collection
on:
  schedule:
    - cron: '*/30 * * * *'
jobs:
  collect:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger collection
        run: curl -X POST https://your-project.vercel.app/api/collect
```

## 🌐 自定义域名（可选）

1. **Vercel项目** → **Settings** → **Domains**
2. 输入域名（如 `popular.hypecat.ai`）
3. 配置DNS记录：
   ```
   类型: CNAME
   名称: popular (或 @)
   值: cname.vercel-dns.com
   ```
4. 更新 `REDDIT_REDIRECT_URI` 为新域名
5. 更新Reddit应用配置

## 📊 监控和调试

### 查看日志
1. Vercel项目 → Deployments
2. 选择部署 → Functions
3. 查看实时日志

### 通过CLI查看日志
```bash
vercel logs
vercel logs --follow  # 实时
```

## ✅ 完成检查

- [ ] 部署成功（状态显示Ready）
- [ ] 环境变量已配置
- [ ] Reddit重定向URI已更新
- [ ] OAuth测试成功
- [ ] 健康检查返回200
- [ ] 数据收集API正常工作
- [ ] Cron任务已配置（可选）
- [ ] 自定义域名已配置（可选）

## 🎉 部署完成！

你的应用现在应该运行在：
```
https://your-project.vercel.app
```

## 🆘 遇到问题？

查看详细文档：
- [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) - 完整部署指南
- [常见问题解答](./VERCEL_DEPLOYMENT.md#常见问题)

或创建Issue：
https://github.com/QinBenJiaRen/hypeCatHotKey/issues
