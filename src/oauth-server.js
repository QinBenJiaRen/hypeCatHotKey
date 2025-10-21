#!/usr/bin/env node

/**
 * Reddit OAuth 服务器启动器
 * 独立运行的OAuth授权服务
 */

import dotenv from 'dotenv';
import RedditOAuthService from './services/redditOAuthService.js';
import logger from './utils/logger.js';

// 加载环境变量
dotenv.config();

class OAuthServerApp {
  constructor() {
    this.oauthService = null;
    this.isShuttingDown = false;
  }

  /**
   * 启动OAuth服务器
   */
  async start() {
    try {
      logger.info('🚀 启动Reddit OAuth服务器...');
      
      // 检查环境变量
      this.checkEnvironment();
      
      // 创建并启动OAuth服务
      this.oauthService = new RedditOAuthService({
        port: process.env.OAUTH_SERVER_PORT || 3000,
      });
      
      await this.oauthService.start();
      
      // 设置优雅关闭
      this.setupGracefulShutdown();
      
      // 显示启动信息
      this.displayStartupInfo();
      
      logger.info('✅ Reddit OAuth服务器启动成功！');
      
    } catch (error) {
      logger.error('❌ OAuth服务器启动失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 停止OAuth服务器
   */
  async stop() {
    if (this.isShuttingDown) {
      return;
    }
    
    this.isShuttingDown = true;
    logger.info('🛑 正在关闭OAuth服务器...');
    
    try {
      if (this.oauthService) {
        await this.oauthService.stop();
      }
      
      logger.info('✅ OAuth服务器已安全关闭');
      process.exit(0);
    } catch (error) {
      logger.error('❌ 关闭OAuth服务器时发生错误:', error.message);
      process.exit(1);
    }
  }

  /**
   * 检查环境变量
   */
  checkEnvironment() {
    const requiredVars = [
      'REDDIT_CLIENT_ID',
      'REDDIT_CLIENT_SECRET',
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      logger.error(`❌ 缺少必要的环境变量: ${missingVars.join(', ')}`);
      logger.error('请在 .env 文件中配置Reddit API信息');
      throw new Error('环境配置不完整');
    }
    
    logger.info('✅ 环境变量检查通过');
  }

  /**
   * 显示启动信息
   */
  displayStartupInfo() {
    const port = process.env.OAUTH_SERVER_PORT || 3000;
    const redirectUri = process.env.REDDIT_REDIRECT_URI || `http://localhost:${port}/auth/reddit/callback`;
    
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                  Reddit OAuth 授权服务                       ║
║                    HypeCat HotKey v1.0.0                    ║
╠══════════════════════════════════════════════════════════════╣
║ 服务器地址: http://localhost:${String(port).padEnd(4)}                         ║
║ 重定向URI: ${redirectUri.padEnd(46)} ║
╠══════════════════════════════════════════════════════════════╣
║ 快速开始:                                                    ║
║   1. 打开浏览器访问: http://localhost:${port}                ║
║   2. 点击"开始Reddit授权"按钮                                ║
║   3. 登录Reddit账号并授权                                    ║
║   4. 获取访问令牌用于API调用                                 ║
╠══════════════════════════════════════════════════════════════╣
║ Reddit应用配置:                                              ║
║   Client ID: ${(process.env.REDDIT_CLIENT_ID || '').substring(0, 20).padEnd(44)} ║
║   Redirect URI: ${redirectUri.padEnd(42)} ║
╠══════════════════════════════════════════════════════════════╣
║ 命令:                                                        ║
║   Ctrl+C     - 关闭服务器                                    ║
║   /health    - 健康检查                                      ║
║   /auth/reddit - 开始授权                                    ║
╚══════════════════════════════════════════════════════════════╝
    `);
  }

  /**
   * 设置优雅关闭
   */
  setupGracefulShutdown() {
    const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        logger.info(`📨 收到 ${signal} 信号，开始关闭OAuth服务器...`);
        await this.stop();
      });
    });
    
    process.on('uncaughtException', (error) => {
      logger.error('💥 未捕获的异常:', error);
      this.stop();
    });
    
    process.on('unhandledRejection', (reason) => {
      logger.error('💥 未处理的 Promise 拒绝:', reason);
      this.stop();
    });
  }

  /**
   * 显示帮助信息
   */
  static showHelp() {
    console.log(`
Reddit OAuth 授权服务 - HypeCat HotKey

用法:
  node src/oauth-server.js [选项]

选项:
  --help, -h         显示帮助信息
  --version, -v      显示版本信息
  --port PORT        指定服务器端口 (默认: 3000)

环境变量:
  REDDIT_CLIENT_ID       Reddit应用的Client ID (必需)
  REDDIT_CLIENT_SECRET   Reddit应用的Client Secret (必需)
  REDDIT_REDIRECT_URI    重定向URI (可选，默认: http://localhost:PORT/auth/reddit/callback)
  OAUTH_SERVER_PORT      服务器端口 (默认: 3000)

示例:
  node src/oauth-server.js              # 启动OAuth服务器
  node src/oauth-server.js --port 8080  # 在8080端口启动

Reddit应用配置:
  1. 访问 https://www.reddit.com/prefs/apps
  2. 创建新应用，类型选择 "web app"
  3. 设置重定向URI为: http://localhost:3000/auth/reddit/callback
  4. 获取Client ID和Client Secret
  5. 在.env文件中配置相应变量

更多信息: https://github.com/QinBenJiaRen/hypeCatHotKey
    `);
  }
}

// 命令行参数处理
async function main() {
  const args = process.argv.slice(2);
  
  try {
    if (args.includes('--help') || args.includes('-h')) {
      OAuthServerApp.showHelp();
      return;
    }
    
    if (args.includes('--version') || args.includes('-v')) {
      console.log('Reddit OAuth Server v1.0.0');
      return;
    }
    
    // 处理端口参数
    const portIndex = args.indexOf('--port');
    if (portIndex !== -1 && args[portIndex + 1]) {
      process.env.OAUTH_SERVER_PORT = args[portIndex + 1];
    }
    
    // 启动OAuth服务器
    const app = new OAuthServerApp();
    await app.start();
    
  } catch (error) {
    logger.error('❌ OAuth服务器执行失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此文件，则执行 main 函数
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMainModule || import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 致命错误:', error);
    process.exit(1);
  });
}

export default OAuthServerApp;