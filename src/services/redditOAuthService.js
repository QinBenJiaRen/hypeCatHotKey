import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { URLSearchParams } from 'url';
import { apiConfig } from '../config/api.js';
import logger from '../utils/logger.js';
import { generateId } from '../utils/helpers.js';

class RedditOAuthService {
  constructor(options = {}) {
    this.app = express();
    this.port = options.port || process.env.OAUTH_SERVER_PORT || 3000;
    this.clientId = process.env.REDDIT_CLIENT_ID;
    this.clientSecret = process.env.REDDIT_CLIENT_SECRET;
    this.redirectUri = process.env.REDDIT_REDIRECT_URI || `http://localhost:${this.port}/auth/reddit/callback`;
    this.baseUrl = 'https://www.reddit.com/api/v1';
    
    // 存储状态和授权码的临时缓存
    this.authStates = new Map();
    this.accessTokens = new Map();
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * 设置中间件
   */
  setupMiddleware() {
    this.app.use(cors({
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true
    }));
    
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // 静态文件服务
    this.app.use(express.static('public'));
  }

  /**
   * 设置路由
   */
  setupRoutes() {
    // 主页 - 显示授权页面
    this.app.get('/', (req, res) => {
      res.send(this.getHomePage());
    });

    // 开始OAuth授权流程
    this.app.get('/auth/reddit', (req, res) => {
      try {
        const state = generateId();
        const scope = 'read identity'; // Reddit权限范围
        
        // 存储state用于验证
        this.authStates.set(state, {
          timestamp: Date.now(),
          ip: req.ip,
        });
        
        const authUrl = new URL('https://www.reddit.com/api/v1/authorize');
        authUrl.searchParams.set('client_id', this.clientId);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('redirect_uri', this.redirectUri);
        authUrl.searchParams.set('duration', 'temporary'); // 临时授权
        authUrl.searchParams.set('scope', scope);
        
        logger.info(`🚀 重定向到Reddit授权页面: ${authUrl.toString()}`);
        res.redirect(authUrl.toString());
      } catch (error) {
        logger.error('创建授权URL失败:', error.message);
        res.status(500).json({ error: '授权流程启动失败' });
      }
    });

    // OAuth回调处理
    this.app.get('/auth/reddit/callback', async (req, res) => {
      try {
        const { code, state, error } = req.query;
        
        // 检查是否有错误
        if (error) {
          logger.error(`Reddit OAuth错误: ${error}`);
          return res.send(this.getErrorPage(`授权失败: ${error}`));
        }
        
        // 验证state参数
        if (!state || !this.authStates.has(state)) {
          logger.error('无效的state参数');
          return res.send(this.getErrorPage('无效的授权状态'));
        }
        
        // 清理过期的state
        this.cleanupExpiredStates();
        
        // 验证授权码
        if (!code) {
          logger.error('缺少授权码');
          return res.send(this.getErrorPage('缺少授权码'));
        }
        
        // 交换访问令牌
        const tokenData = await this.exchangeCodeForToken(code);
        
        if (tokenData) {
          // 获取用户信息
          const userInfo = await this.getUserInfo(tokenData.access_token);
          
          // 存储访问令牌
          const tokenId = generateId();
          this.accessTokens.set(tokenId, {
            ...tokenData,
            userInfo,
            timestamp: Date.now(),
          });
          
          logger.info(`✅ Reddit OAuth授权成功: ${userInfo?.name || 'Unknown'}`);
          res.send(this.getSuccessPage(userInfo, tokenId));
        } else {
          res.send(this.getErrorPage('获取访问令牌失败'));
        }
        
        // 清理已使用的state
        this.authStates.delete(state);
        
      } catch (error) {
        logger.error('OAuth回调处理失败:', error.message);
        res.send(this.getErrorPage(`处理授权回调失败: ${error.message}`));
      }
    });

    // 获取存储的令牌信息
    this.app.get('/auth/tokens/:tokenId', (req, res) => {
      try {
        const { tokenId } = req.params;
        const tokenData = this.accessTokens.get(tokenId);
        
        if (!tokenData) {
          return res.status(404).json({ error: '令牌不存在或已过期' });
        }
        
        // 返回令牌信息（不包含敏感数据）
        res.json({
          userInfo: tokenData.userInfo,
          scope: tokenData.scope,
          timestamp: tokenData.timestamp,
          expires_in: tokenData.expires_in,
        });
      } catch (error) {
        logger.error('获取令牌信息失败:', error.message);
        res.status(500).json({ error: '服务器错误' });
      }
    });

    // 测试API访问
    this.app.get('/test/reddit/:tokenId', async (req, res) => {
      try {
        const { tokenId } = req.params;
        const tokenData = this.accessTokens.get(tokenId);
        
        if (!tokenData) {
          return res.status(404).json({ error: '令牌不存在或已过期' });
        }
        
        // 测试获取用户的热门帖子
        const posts = await this.testRedditAPI(tokenData.access_token);
        
        res.json({
          success: true,
          message: 'Reddit API访问成功',
          userInfo: tokenData.userInfo,
          sampleData: posts,
        });
      } catch (error) {
        logger.error('测试Reddit API失败:', error.message);
        res.status(500).json({ error: `API测试失败: ${error.message}` });
      }
    });

    // 健康检查
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        activeTokens: this.accessTokens.size,
        pendingStates: this.authStates.size,
      });
    });
  }

  /**
   * 交换授权码为访问令牌
   * @param {string} code 
   * @returns {Promise<Object|null>}
   */
  async exchangeCodeForToken(code) {
    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post(
        `${this.baseUrl}/access_token`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.redirectUri,
        }),
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'HypeCatHotKey/1.0.0 OAuth Client',
          },
        }
      );
      
      logger.info('✅ 成功获取Reddit访问令牌');
      return response.data;
    } catch (error) {
      logger.error('交换访问令牌失败:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * 获取用户信息
   * @param {string} accessToken 
   * @returns {Promise<Object|null>}
   */
  async getUserInfo(accessToken) {
    try {
      const response = await axios.get('https://oauth.reddit.com/api/v1/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'HypeCatHotKey/1.0.0 OAuth Client',
        },
      });
      
      return response.data;
    } catch (error) {
      logger.error('获取用户信息失败:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * 测试Reddit API访问
   * @param {string} accessToken 
   * @returns {Promise<Array>}
   */
  async testRedditAPI(accessToken) {
    try {
      const response = await axios.get('https://oauth.reddit.com/hot', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'HypeCatHotKey/1.0.0 OAuth Client',
        },
        params: {
          limit: 5,
        },
      });
      
      const posts = response.data?.data?.children || [];
      return posts.map(post => ({
        title: post.data.title,
        score: post.data.score,
        subreddit: post.data.subreddit,
        url: post.data.url,
      }));
    } catch (error) {
      logger.error('测试Reddit API失败:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 清理过期的状态
   */
  cleanupExpiredStates() {
    const now = Date.now();
    const expireTime = 10 * 60 * 1000; // 10分钟过期
    
    for (const [state, data] of this.authStates.entries()) {
      if (now - data.timestamp > expireTime) {
        this.authStates.delete(state);
      }
    }
  }

  /**
   * 清理过期的令牌
   */
  cleanupExpiredTokens() {
    const now = Date.now();
    const expireTime = 60 * 60 * 1000; // 1小时过期
    
    for (const [tokenId, data] of this.accessTokens.entries()) {
      if (now - data.timestamp > expireTime) {
        this.accessTokens.delete(tokenId);
      }
    }
  }

  /**
   * 生成主页HTML
   */
  getHomePage() {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reddit OAuth 授权 - HypeCat HotKey</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #ff4500; }
        .button { display: inline-block; background: #ff4500; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
        .button:hover { background: #e63e00; }
        .info { background: #f0f8ff; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .step { margin: 10px 0; padding-left: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🐱 HypeCat HotKey</div>
            <h2>Reddit OAuth 授权服务</h2>
        </div>
        
        <div class="info">
            <h3>📋 授权说明</h3>
            <div class="step">1. 点击下方按钮开始授权流程</div>
            <div class="step">2. 登录您的Reddit账号</div>
            <div class="step">3. 授权应用访问您的基本信息</div>
            <div class="step">4. 完成后返回获取API访问令牌</div>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="/auth/reddit" class="button">🚀 开始Reddit授权</a>
        </div>
        
        <div class="info">
            <h3>🔒 隐私说明</h3>
            <p>本应用仅请求基本的读取权限，不会访问您的私人信息或进行任何写入操作。</p>
            <p>授权令牌仅用于获取公开的热门内容数据。</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #666;">
            <p>服务器状态: <a href="/health">健康检查</a></p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 生成成功页面HTML
   */
  getSuccessPage(userInfo, tokenId) {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>授权成功 - HypeCat HotKey</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .code { background: #f8f9fa; border: 1px solid #e9ecef; padding: 10px; border-radius: 4px; font-family: monospace; word-break: break-all; }
        .button { display: inline-block; background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin: 5px; }
        .info { background: #f0f8ff; padding: 15px; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h2>✅ Reddit OAuth 授权成功！</h2>
        
        <div class="success">
            <h3>用户信息</h3>
            <p><strong>用户名:</strong> ${userInfo?.name || 'Unknown'}</p>
            <p><strong>用户ID:</strong> ${userInfo?.id || 'Unknown'}</p>
            <p><strong>创建时间:</strong> ${userInfo?.created_utc ? new Date(userInfo.created_utc * 1000).toLocaleString() : 'Unknown'}</p>
        </div>
        
        <div class="info">
            <h3>🔑 访问令牌ID</h3>
            <div class="code">${tokenId}</div>
            <p><small>请保存此ID，可用于测试API访问</small></p>
        </div>
        
        <div style="text-align: center; margin: 20px 0;">
            <a href="/test/reddit/${tokenId}" class="button">🧪 测试API访问</a>
            <a href="/auth/tokens/${tokenId}" class="button">📋 查看令牌信息</a>
            <a href="/" class="button">🏠 返回首页</a>
        </div>
        
        <div class="info">
            <h3>📝 配置信息</h3>
            <p>现在您可以使用以下配置信息更新您的 <code>.env</code> 文件：</p>
            <div class="code">
# Reddit API 配置已验证<br>
REDDIT_CLIENT_ID=${this.clientId}<br>
REDDIT_CLIENT_SECRET=${this.clientSecret}<br>
REDDIT_REDIRECT_URI=${this.redirectUri}
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 生成错误页面HTML
   */
  getErrorPage(errorMessage) {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>授权失败 - HypeCat HotKey</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .button { display: inline-block; background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <h2>❌ Reddit OAuth 授权失败</h2>
        
        <div class="error">
            <h3>错误信息</h3>
            <p>${errorMessage}</p>
        </div>
        
        <div style="text-align: center; margin: 20px 0;">
            <a href="/" class="button">🏠 返回首页重试</a>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * 启动OAuth服务器
   */
  start() {
    return new Promise((resolve, reject) => {
      if (!this.clientId || !this.clientSecret) {
        const error = new Error('Reddit Client ID 和 Client Secret 必须配置');
        logger.error(error.message);
        reject(error);
        return;
      }

      this.server = this.app.listen(this.port, () => {
        logger.info(`🌐 Reddit OAuth服务器启动成功: http://localhost:${this.port}`);
        logger.info(`📋 重定向URI: ${this.redirectUri}`);
        logger.info(`🔗 开始授权: http://localhost:${this.port}/auth/reddit`);
        
        // 定期清理过期数据
        this.cleanupInterval = setInterval(() => {
          this.cleanupExpiredStates();
          this.cleanupExpiredTokens();
        }, 5 * 60 * 1000); // 每5分钟清理一次
        
        resolve(this);
      });

      this.server.on('error', (error) => {
        logger.error('OAuth服务器启动失败:', error.message);
        reject(error);
      });
    });
  }

  /**
   * 停止OAuth服务器
   */
  stop() {
    return new Promise((resolve) => {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }
      
      if (this.server) {
        this.server.close(() => {
          logger.info('🛑 Reddit OAuth服务器已停止');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * 获取有效的访问令牌（供其他服务使用）
   * @returns {string|null}
   */
  getValidAccessToken() {
    for (const [tokenId, data] of this.accessTokens.entries()) {
      const age = Date.now() - data.timestamp;
      if (age < 50 * 60 * 1000) { // 50分钟内有效
        return data.access_token;
      }
    }
    return null;
  }

  /**
   * 获取授权用户信息
   * @returns {Object|null}
   */
  getAuthorizedUser() {
    for (const [tokenId, data] of this.accessTokens.entries()) {
      const age = Date.now() - data.timestamp;
      if (age < 50 * 60 * 1000) { // 50分钟内有效
        return data.userInfo;
      }
    }
    return null;
  }
}

export default RedditOAuthService;