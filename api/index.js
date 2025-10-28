// Vercel Serverless Function - 主页
export default async function handler(req, res) {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HypeCat HotKey - 全球热点数据收集</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 600px;
            width: 100%;
            padding: 40px;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 2em;
        }
        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 1.1em;
        }
        .feature {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 15px 0;
            border-radius: 5px;
        }
        .feature h3 {
            color: #667eea;
            margin-bottom: 8px;
        }
        .feature p {
            color: #666;
            line-height: 1.6;
        }
        .btn-container {
            margin-top: 30px;
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
        }
        .btn {
            flex: 1;
            min-width: 150px;
            padding: 15px 30px;
            border: none;
            border-radius: 10px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            text-align: center;
            display: inline-block;
        }
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
        }
        .btn-secondary {
            background: white;
            color: #667eea;
            border: 2px solid #667eea;
        }
        .btn-secondary:hover {
            background: #f8f9fa;
        }
        .info {
            background: #e7f3ff;
            border-left: 4px solid #2196F3;
            padding: 15px;
            margin-top: 20px;
            border-radius: 5px;
        }
        .info p {
            color: #1976D2;
            margin: 5px 0;
        }
        .status {
            display: inline-block;
            padding: 5px 15px;
            background: #4CAF50;
            color: white;
            border-radius: 20px;
            font-size: 14px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="status">🟢 运行中</div>
        <h1>🌐 HypeCat HotKey</h1>
        <p class="subtitle">全球热点数据收集服务 - Vercel部署版</p>
        
        <div class="feature">
            <h3>📊 数据来源</h3>
            <p>Twitter API、Reddit API、Google Trends - 实时收集全球热门话题</p>
        </div>
        
        <div class="feature">
            <h3>🔐 OAuth认证</h3>
            <p>支持Reddit OAuth 2.0授权，安全获取用户数据</p>
        </div>
        
        <div class="feature">
            <h3>💾 云端存储</h3>
            <p>数据存储在Supabase，支持实时查询和分析</p>
        </div>
        
        <div class="btn-container">
            <a href="/auth/reddit" class="btn btn-primary">
                🔑 Reddit授权
            </a>
            <a href="/api/collect" class="btn btn-secondary">
                🚀 手动收集数据
            </a>
        </div>
        
        <div class="info">
            <p><strong>💡 提示：</strong></p>
            <p>• 首次使用需要先完成Reddit OAuth授权</p>
            <p>• 数据每30分钟自动收集一次（Vercel Cron）</p>
            <p>• 支持API接口调用进行数据查询</p>
        </div>
    </div>
</body>
</html>
  `;
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
