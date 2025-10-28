// Vercel Serverless Function - Reddit OAuth授权
import crypto from 'crypto';

export default async function handler(req, res) {
  try {
    const clientId = process.env.REDDIT_CLIENT_ID;
    const redirectUri = process.env.REDDIT_REDIRECT_URI;
    
    if (!clientId || !redirectUri) {
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Missing Reddit API credentials'
      });
    }
    
    // 生成随机state用于防止CSRF攻击
    const state = crypto.randomBytes(16).toString('hex');
    
    // 将state存储在cookie中（Vercel无服务器环境中的临时存储）
    res.setHeader('Set-Cookie', `reddit_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600`);
    
    // 构建Reddit授权URL
    const authUrl = new URL('https://www.reddit.com/api/v1/authorize');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('duration', 'permanent');
    authUrl.searchParams.append('scope', 'read identity');
    
    // 重定向到Reddit授权页面
    res.redirect(302, authUrl.toString());
  } catch (error) {
    console.error('Reddit OAuth error:', error);
    res.status(500).json({
      error: 'OAuth initialization failed',
      message: error.message
    });
  }
}
