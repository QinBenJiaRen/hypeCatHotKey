# HypeCat HotKey Windows 部署脚本
# 用途：在 Windows 服务器上部署应用
# 使用方法：以管理员身份运行 PowerShell，然后执行 .\deploy.ps1

# 检查管理员权限
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ 请以管理员身份运行此脚本" -ForegroundColor Red
    Write-Host "右键点击 PowerShell 选择 '以管理员身份运行'" -ForegroundColor Yellow
    exit 1
}

Write-Host "🚀 开始部署 HypeCat HotKey..." -ForegroundColor Green

# 配置变量
$APP_DIR = "C:\inetpub\hypecat"
$DOMAIN = "your-domain.com"  # 修改为你的域名

# 1. 检查 Node.js
Write-Host "`n📦 步骤 1/6: 检查 Node.js..." -ForegroundColor Green
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ 请先安装 Node.js 18 或更高版本" -ForegroundColor Red
    Write-Host "下载地址: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Node.js 版本: $(node -v)" -ForegroundColor Cyan
Write-Host "✅ npm 版本: $(npm -v)" -ForegroundColor Cyan

# 2. 安装 PM2
Write-Host "`n📦 步骤 2/6: 安装 PM2..." -ForegroundColor Green
if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    npm install -g pm2
    npm install -g pm2-windows-startup
    pm2-startup install
}
Write-Host "✅ PM2 版本: $(pm2 -v)" -ForegroundColor Cyan

# 3. 创建应用目录
Write-Host "`n📁 步骤 3/6: 准备应用目录..." -ForegroundColor Green
if (Test-Path $APP_DIR) {
    Write-Host "更新现有代码..." -ForegroundColor Yellow
    Set-Location $APP_DIR
    git pull origin main
} else {
    Write-Host "克隆代码仓库..." -ForegroundColor Yellow
    git clone https://github.com/QinBenJiaRen/hypeCatHotKey.git $APP_DIR
    Set-Location $APP_DIR
}

# 4. 安装依赖
Write-Host "`n📦 步骤 4/6: 安装应用依赖..." -ForegroundColor Green
npm install --production

# 5. 配置环境变量
Write-Host "`n⚙️  步骤 5/6: 配置环境变量..." -ForegroundColor Green
$envFile = Join-Path $APP_DIR ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "创建 .env 文件..." -ForegroundColor Yellow
    @"
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
"@ | Out-File -FilePath $envFile -Encoding utf8
    
    Write-Host "`n⚠️  请编辑 $envFile 文件，填入实际的配置值" -ForegroundColor Yellow
    Write-Host "编辑完成后，重新运行此脚本继续部署" -ForegroundColor Yellow
    notepad $envFile
    exit 0
}

# 6. 启动应用
Write-Host "`n🚀 步骤 6/6: 启动应用..." -ForegroundColor Green
pm2 delete all 2>$null
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup

# 配置 Windows 防火墙
Write-Host "`n🔒 配置防火墙规则..." -ForegroundColor Green
netsh advfirewall firewall delete rule name="HypeCat OAuth" 2>$null
netsh advfirewall firewall add rule name="HypeCat OAuth" dir=in action=allow protocol=TCP localport=3000

# 输出部署信息
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ 部署完成！" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "`n📊 部署信息" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "应用目录: $APP_DIR"
Write-Host "本地访问: http://localhost:3000"
Write-Host "OAuth服务: http://localhost:3000"
Write-Host ""
Write-Host "🔧 常用命令" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "查看进程状态: pm2 status"
Write-Host "查看日志: pm2 logs"
Write-Host "重启服务: pm2 restart all"
Write-Host "停止服务: pm2 stop all"
Write-Host ""
Write-Host "📋 IIS 反向代理配置（可选）" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "1. 安装 IIS 和 URL Rewrite 模块"
Write-Host "2. 安装 Application Request Routing (ARR)"
Write-Host "3. 配置反向代理到 localhost:3000"
Write-Host "4. 配置 SSL 证书"
Write-Host ""
Write-Host "⚠️  重要提示" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "- 生产环境建议使用 IIS 或 Nginx 作为反向代理"
Write-Host "- 确保已配置 HTTPS (SSL证书)"
Write-Host "- 在 Reddit 应用设置中添加重定向URI: https://$DOMAIN/auth/reddit/callback"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# 打开浏览器测试
Start-Process "http://localhost:3000"