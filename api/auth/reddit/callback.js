// Vercel Serverless Function - Reddit OAuth回调处理
import axios from 'axios';

// 解析cookie
function parseCookies(cookieHeader) {
  const cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      cookies[name] = value;
    });
  }
  return cookies;
}

export default async function handler(req, res) {
  try {
    const { code, state, error } = req.query;
    
    // 检查是否有错误
    if (error) {
      return sendErrorPage(res, 'Reddit授权失败', `错误: ${error}`);
    }
    
    // 验证必需参数
    if (!code || !state) {
      return sendErrorPage(res, '授权失败', '缺少必需的授权参数');
    }
    
    // 验证state防止CSRF攻击
    const cookies = parseCookies(req.headers.cookie);
    const savedState = cookies.reddit_oauth_state;
    
    if (!savedState || savedState !== state) {
      return sendErrorPage(res, '安全验证失败', 'State参数不匹配，可能存在CSRF攻击');
    }
    
    // 获取环境变量
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    const redirectUri = process.env.REDDIT_REDIRECT_URI;
    
    if (!clientId || !clientSecret || !redirectUri) {
      return sendErrorPage(res, '服务器配置错误', '缺少Reddit API配置');
    }
    
    // 交换授权码获取访问令牌
    const tokenResponse = await axios.post(
      'https://www.reddit.com/api/v1/access_token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      }),
      {
        auth: {
          username: clientId,
          password: clientSecret
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': process.env.REDDIT_USER_AGENT || 'HypeCatHotKey/1.0.0'
        }
      }
    );
    
    const { access_token, refresh_token, expires_in, scope } = tokenResponse.data;
    
    // 使用访问令牌获取用户信息
    const userResponse = await axios.get('https://oauth.reddit.com/api/v1/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'User-Agent': process.env.REDDIT_USER_AGENT || 'HypeCatHotKey/1.0.0'
      }
    });
    
    const userData = userResponse.data;
    
    // 清除state cookie
    res.setHeader('Set-Cookie', 'reddit_oauth_state=; Path=/; HttpOnly; Max-Age=0');
    
    // 返回成功页面
    sendSuccessPage(res, {
      username: userData.name,
      id: userData.id,
      karma: userData.total_karma,
      created: new Date(userData.created_utc * 1000).toLocaleDateString('zh-CN'),
      accessToken: access_token.substring(0, 10) + '...',
      refreshToken: refresh_token ? refresh_token.substring(0, 10) + '...' : 'N/A',
      expiresIn: expires_in,
      scope: scope
    });
    
  } catch (error) {
    console.error('Reddit OAuth callback error:', error);
    
    let errorMessage = error.message;
    if (error.response) {
      errorMessage = `Reddit API错误: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
    }
    
    sendErrorPage(res, 'OAuth处理失败', errorMessage);
  }
}

function sendSuccessPage(res, data) {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>授权成功 - HypeCat HotKey</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
        .success-icon {
            width: 80px;
            height: 80px;
            background: #4CAF50;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-size: 40px;
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .user-info {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .label {
            font-weight: 600;
            color: #666;
        }
        .value {
            color: #333;
            font-family: monospace;
        }
        .token-info {
            background: #e7f3ff;
            border-left: 4px solid #2196F3;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .token-info p {
            color: #1976D2;
            margin: 5px 0;
        }
        .btn {
            display: block;
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 600;
            margin-top: 20px;
            transition: transform 0.3s ease;
        }
        .btn:hover {
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success-icon">✓</div>
        <h1>🎉 Reddit授权成功！</h1>
        
        <div class="user-info">
            <div class="info-row">
                <span class="label">用户名:</span>
                <span class="value">${data.username}</span>
            </div>
            <div class="info-row">
                <span class="label">用户ID:</span>
                <span class="value">${data.id}</span>
            </div>
            <div class="info-row">
                <span class="label">总Karma:</span>
                <span class="value">${data.karma}</span>
            </div>
            <div class="info-row">
                <span class="label">账号创建:</span>
                <span class="value">${data.created}</span>
            </div>
        </div>
        
        <div class="token-info">
            <p><strong>🔑 令牌信息：</strong></p>
            <p>访问令牌: ${data.accessToken}</p>
            <p>刷新令牌: ${data.refreshToken}</p>
            <p>有效期: ${data.expiresIn}秒</p>
            <p>权限范围: ${data.scope}</p>
        </div>
        
        <a href="/" class="btn">返回首页</a>
    </div>
</body>
</html>
  `;
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}

function sendErrorPage(res, title, message) {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - HypeCat HotKey</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
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
        .error-icon {
            width: 80px;
            height: 80px;
            background: #f44336;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-size: 40px;
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 20px;
        }
        .error-message {
            background: #ffebee;
            border-left: 4px solid #f44336;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
            color: #c62828;
        }
        .btn {
            display: block;
            width: 100%;
            padding: 15px;
            background: #667eea;
            color: white;
            text-align: center;
            text-decoration: none;
            border-radius: 10px;
            font-weight: 600;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-icon">✗</div>
        <h1>${title}</h1>
        <div class="error-message">
            <p>${message}</p>
        </div>
        <a href="/" class="btn">返回首页</a>
        <a href="/auth/reddit" class="btn" style="background: #4CAF50; margin-top: 10px;">重新授权</a>
    </div>
</body>
</html>
  `;
  
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(400).send(html);
}
