# HypeCat HotKey

> 全球热点数据采集应用 - 准实时获取 Twitter、Reddit、Google Trends 热点数据

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/QinBenJiaRen/hypeCatHotKey)

## 📖 简介

HypeCat HotKey 是一个基于 Node.js 的全球热点数据采集应用，能够从多个数据源实时获取热点信息，并将数据存储到 Supabase 数据库中。

**支持两种部署方式**：
- 🚀 **Vercel无服务器部署**（推荐） - 零配置，一键部署
- 🖥️ **传统VPS部署** - 使用PM2 + Nginx

### 🌟 主要功能

- **多数据源采集**: 支持 Twitter API、Reddit API、Google Trends API
- **智能数据处理**: 自动去重、关键词提取、地区分类
- **准实时更新**: 可配置的定时采集机制
- **数据存储**: 集成 Supabase PostgreSQL 数据库
- **OAuth认证**: 支持 Reddit OAuth 2.0 授权流程
- **优雅设计**: 遵循 Node.js 开发规范，模块化架构

### 📊 数据源

| 数据源 | 说明 | 授权要求 |
|--------|------|----------|
| **Twitter API** | 获取实时推文趋势 | ✅ 需要 Bearer Token |
| **Reddit API** | 获取热门帖子 | ✅ 需要 Client ID/Secret |
| **Google Trends** | 获取搜索趋势 | ❌ 无需认证 |

## 🚀 快速开始

### 部署选择

**选项 A: Vercel 部署（推荐新手）**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/QinBenJiaRen/hypeCatHotKey)

点击按钮，5分钟完成部署！查看 [Vercel部署指南](./VERCEL_DEPLOYMENT.md)

**选项 B: VPS/服务器部署**

适合需要完全控制的用户。查看 [生产环境部署指南](./PRODUCTION_DEPLOYMENT.md)

### 环境要求

- Node.js 18.0.0+
- npm 或 yarn
- Supabase 账号

### 安装

```bash
# 克隆项目
git clone https://github.com/QinBenJiaRen/hypeCatHotKey.git
cd hypeCatHotKey

# 安装依赖
npm install
```

### 配置

1. **复制环境变量文件**

```bash
cp .env.example .env
```

2. **配置环境变量**

编辑 `.env` 文件，填入你的配置：

```env
# Supabase 配置（必需）
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Twitter API 配置（可选）
TWITTER_BEARER_TOKEN=your_twitter_bearer_token

# Reddit API 配置（可选）
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret

# 应用配置
COLLECTION_INTERVAL_MINUTES=30
TOP_ITEMS_LIMIT=10
```

3. **创建数据库表**

在 Supabase SQL 编辑器中执行：

```sql
CREATE TABLE IF NOT EXISTS worldHotKeys (
  id SERIAL PRIMARY KEY,
  area VARCHAR(50) NOT NULL,
  hotKeys VARCHAR(100) NOT NULL,
  hotKeysDesc VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(area, hotKeys)
);

CREATE INDEX IF NOT EXISTS idx_worldHotKeys_area ON worldHotKeys(area);
CREATE INDEX IF NOT EXISTS idx_worldHotKeys_updated_at ON worldHotKeys(updated_at);
```

### 运行

```bash
# 启动应用（生产模式）
npm start

# 开发模式启动
npm run dev

# 启动Reddit OAuth授权服务器
npm run oauth

# 执行单次数据收集
npm start -- --once

# 显示帮助信息
npm start -- --help
```

## 🔧 API 配置指南

### Twitter API

1. 访问 [Twitter Developer Portal](https://developer.twitter.com/)
2. 创建新应用
3. 获取 Bearer Token
4. 在 `.env` 中设置 `TWITTER_BEARER_TOKEN`

### Reddit API

1. 访问 [Reddit App Preferences](https://www.reddit.com/prefs/apps)
2. 创建新应用（选择 "web app" 类型）
3. 设置重定向URI为: `http://localhost:3000/auth/reddit/callback`
4. 获取 Client ID 和 Client Secret
5. 在 `.env` 中设置相应变量

#### 🔥 快速OAuth授权
```bash
# 启动OAuth服务器
npm run oauth

# 浏览器访问 http://localhost:3000
# 完成Reddit授权获取访问令牌
```

详细说明请参考: [Reddit OAuth指南](REDDIT_OAUTH_GUIDE.md)

### Google Trends

无需 API 密钥，但可能受反爬虫限制。如果无法获取数据，应用会使用模拟数据。

## 📁 项目结构

```
hypeCatHotKey/
├── src/
│   ├── config/          # 配置文件
│   │   ├── api.js       # API 配置
│   │   └── supabase.js  # 数据库配置
│   ├── constants/       # 常量定义
│   │   └── index.js
│   ├── services/        # 服务层
│   │   ├── twitterService.js      # Twitter API 服务
│   │   ├── redditService.js       # Reddit API 服务
│   │   ├── redditOAuthService.js  # Reddit OAuth 服务
│   │   ├── googleTrendsService.js # Google Trends 服务
│   │   ├── databaseService.js     # 数据库服务
│   │   ├── dataCollectorService.js # 数据收集服务
│   │   └── schedulerService.js    # 定时任务服务
│   ├── utils/           # 工具函数
│   │   ├── helpers.js   # 通用工具
│   │   └── logger.js    # 日志工具
│   ├── main.js          # 应用入口
│   └── oauth-server.js  # OAuth服务器入口
├── .env                 # 环境变量
├── .gitignore          # Git 忽略文件
├── package.json        # 项目配置
├── README.md           # 项目文档
├── REDDIT_OAUTH_GUIDE.md # Reddit OAuth指南
└── OAUTH_DEMO.md       # OAuth演示说明
```

## 🎯 使用说明

### 命令行选项

```bash
# 基本使用
node src/main.js                    # 启动应用
node src/main.js --once             # 执行单次收集
node src/main.js --status           # 查看状态
node src/main.js --test-db          # 测试数据库连接
node src/main.js --create-table     # 显示建表 SQL
node src/main.js --help             # 显示帮助

# OAuth服务器
node src/oauth-server.js            # 启动OAuth服务器
node src/oauth-server.js --port 8080 # 指定端口启动
npm run oauth                       # 使用npm脚本启动
```

### 数据格式

存储在 `worldHotKeys` 表中的数据格式：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | SERIAL | 主键 |
| `area` | VARCHAR(50) | 地区分类（如：global, united_states, china） |
| `hotKeys` | VARCHAR(100) | 热点关键词 |
| `hotKeysDesc` | VARCHAR(500) | 热点描述（1-5个关键词） |
| `created_at` | TIMESTAMP | 创建时间 |
| `updated_at` | TIMESTAMP | 更新时间 |

### 地区分类

- `global` - 全球
- `united_states` - 美国  
- `china` - 中国
- `europe` - 欧洲
- `asia` - 亚洲
- `africa` - 非洲
- `oceania` - 大洋洲
- `south_america` - 南美洲

## 🔄 工作流程

1. **数据采集**: 定时从各 API 获取热点数据
2. **数据处理**: 提取关键词、去重、分类
3. **数据存储**: 保存到 Supabase 数据库
4. **重复检测**: 如果数据已存在，只更新时间戳
5. **定期清理**: 自动清理过期数据

## ⚙️ 配置选项

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `development` |
| `COLLECTION_INTERVAL_MINUTES` | 采集间隔（分钟） | `30` |
| `TOP_ITEMS_LIMIT` | 每次采集数量限制 | `10` |
| `LOG_LEVEL` | 日志级别 | `info` |

### 定时任务

- **数据采集**: 每 N 分钟执行（可配置）
- **数据清理**: 每天凌晨 2 点执行
- **状态报告**: 每小时执行

## 🛠️ 开发

### 本地开发

```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev

# 执行测试
npm test
```

### 代码规范

- 使用 ES6+ 模块语法
- 遵循函数式编程原则
- 完善的错误处理和日志记录
- 模块化架构设计

## 📝 日志

应用提供详细的日志输出：

- ✅ 成功操作
- ⚠️ 警告信息  
- ❌ 错误信息
- 📊 统计数据
- 🔄 任务状态

## � 相关文档

- 📘 [Vercel部署指南](./VERCEL_DEPLOYMENT.md) - 无服务器部署（推荐）
- 📗 [生产环境部署](./PRODUCTION_DEPLOYMENT.md) - VPS/服务器部署
- 📙 [Reddit OAuth指南](./REDDIT_OAUTH_GUIDE.md) - OAuth认证配置
- 📕 [OAuth演示说明](./OAUTH_DEMO.md) - OAuth流程演示

## �🚨 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查 Supabase URL 和 Service Role Key
   - 确认网络连接正常

2. **API 认证失败**
   - 验证 API 密钥是否正确
   - 检查 API 配额和权限

3. **没有数据采集**
   - 检查 API 配置
   - 查看日志输出
   - 使用 `--once` 参数测试

### 调试模式

```bash
# 设置调试日志级别
LOG_LEVEL=debug npm start
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 发起 Pull Request

## � 生产环境部署

### 域名配置 (popular.hypecat.ai)

如果要将服务部署到域名 `popular.hypecat.ai`：

1. **Reddit应用配置**：
   - 重定向URI: `https://popular.hypecat.ai/auth/reddit/callback`
   - 可同时保留开发环境URI: `http://localhost:3000/auth/reddit/callback`

2. **环境变量配置**：
   ```env
   REDDIT_REDIRECT_URI=https://popular.hypecat.ai/auth/reddit/callback
   OAUTH_SERVER_PORT=3000
   NODE_ENV=production
   ```

3. **服务器配置**：
   - 配置Nginx反向代理
   - 安装SSL证书（Let's Encrypt）
   - 使用PM2管理进程

📘 **详细部署指南**：查看 [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) 了解完整的生产环境配置步骤

## �📄 许可证

本项目采用 [MIT 许可证](LICENSE)。

## 🙏 致谢

- [Supabase](https://supabase.io/) - 数据库服务
- [Twitter API](https://developer.twitter.com/) - 推文数据
- [Reddit API](https://www.reddit.com/dev/api/) - Reddit 数据
- [Google Trends](https://trends.google.com/) - 搜索趋势数据

---

如有问题或建议，请创建 [Issue](https://github.com/QinBenJiaRen/hypeCatHotKey/issues) 或联系开发者。