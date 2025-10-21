#!/usr/bin/env node

/**
 * HypeCat HotKey - 全球热点数据采集应用
 * 
 * 功能：
 * - 从 Twitter、Reddit、Google Trends 采集热点数据
 * - 数据去重、分类、存储到 Supabase 数据库
 * - 定时采集确保数据实时性
 * - 支持命令行参数控制
 */

import dotenv from 'dotenv';
import process from 'process';
import SchedulerService from './services/schedulerService.js';
import DatabaseService from './services/databaseService.js';
import DataCollectorService from './services/dataCollectorService.js';
import logger from './utils/logger.js';
import { appConfig } from './config/api.js';

// 加载环境变量
dotenv.config();

class HypeCatHotKeyApp {
  constructor() {
    this.scheduler = new SchedulerService();
    this.database = new DatabaseService();
    this.dataCollector = new DataCollectorService();
    this.isShuttingDown = false;
  }

  /**
   * 启动应用
   */
  async start() {
    try {
      logger.info('🚀 启动 HypeCat HotKey 应用...');
      
      // 检查环境配置
      await this.checkEnvironment();
      
      // 测试数据库连接
      await this.testDatabaseConnection();
      
      // 显示启动信息
      this.displayStartupInfo();
      
      // 启动调度器
      this.scheduler.start();
      
      // 设置优雅关闭
      this.setupGracefulShutdown();
      
      logger.info('✅ 应用启动成功！');
      
      return true;
    } catch (error) {
      logger.error('❌ 应用启动失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 停止应用
   */
  async stop() {
    if (this.isShuttingDown) {
      return;
    }
    
    this.isShuttingDown = true;
    logger.info('🛑 正在关闭应用...');
    
    try {
      // 停止调度器
      this.scheduler.stop();
      
      // 等待任务完成
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      logger.info('✅ 应用已安全关闭');
      process.exit(0);
    } catch (error) {
      logger.error('❌ 关闭应用时发生错误:', error.message);
      process.exit(1);
    }
  }

  /**
   * 检查环境配置
   */
  async checkEnvironment() {
    logger.info('🔍 检查环境配置...');
    
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      logger.error(`❌ 缺少必要的环境变量: ${missingVars.join(', ')}`);
      throw new Error('环境配置不完整');
    }
    
    // 检查 API 配置
    const apiWarnings = [];
    
    if (!process.env.TWITTER_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN === 'your_twitter_bearer_token_here') {
      apiWarnings.push('Twitter API');
    }
    
    if (!process.env.REDDIT_CLIENT_ID || process.env.REDDIT_CLIENT_ID === 'your_reddit_client_id_here') {
      apiWarnings.push('Reddit API');
    }
    
    if (apiWarnings.length > 0) {
      logger.warn(`⚠️  以下 API 未配置，将使用模拟数据: ${apiWarnings.join(', ')}`);
      logger.warn('请在 .env 文件中配置相应的 API 密钥以获取真实数据');
    }
    
    logger.info('✅ 环境配置检查完成');
  }

  /**
   * 测试数据库连接
   */
  async testDatabaseConnection() {
    logger.info('🔗 测试数据库连接...');
    
    const isConnected = await this.database.testConnection();
    
    if (!isConnected) {
      throw new Error('数据库连接失败');
    }
    
    logger.info('✅ 数据库连接正常');
  }

  /**
   * 显示启动信息
   */
  displayStartupInfo() {
    const config = {
      nodeEnv: appConfig.nodeEnv,
      collectionInterval: appConfig.collectionInterval,
      topItemsLimit: appConfig.topItemsLimit,
    };
    
    logger.info('📋 应用配置:', config);
    
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    HypeCat HotKey v1.0.0                    ║
║                  全球热点数据采集应用                         ║
╠══════════════════════════════════════════════════════════════╣
║ 数据源: Twitter API, Reddit API, Google Trends API         ║
║ 数据库: Supabase PostgreSQL                                 ║
║ 采集间隔: ${String(config.collectionInterval).padEnd(3)} 分钟                                      ║
║ 数据限制: 每次最多 ${String(config.topItemsLimit).padEnd(2)} 条热点                             ║
╠══════════════════════════════════════════════════════════════╣
║ 命令:                                                        ║
║   Ctrl+C     - 优雅关闭应用                                  ║
║   npm start  - 启动应用                                      ║
║   npm run dev - 开发模式启动                                 ║
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
        logger.info(`📨 收到 ${signal} 信号，开始关闭应用...`);
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
   * 执行单次数据收集
   */
  async runOnce() {
    logger.info('🏃‍♂️ 执行单次数据收集...');
    
    try {
      await this.checkEnvironment();
      await this.testDatabaseConnection();
      
      const results = await this.dataCollector.collectAllData();
      
      logger.info('✅ 单次数据收集完成');
      logger.info('📊 收集结果:', {
        twitter: results.twitter?.length || 0,
        reddit: results.reddit?.length || 0,
        googleTrends: results.googleTrends?.length || 0,
        total: results.total || 0,
        errors: results.errors?.length || 0,
      });
      
      return results;
    } catch (error) {
      logger.error('❌ 单次数据收集失败:', error.message);
      throw error;
    }
  }

  /**
   * 显示帮助信息
   */
  static showHelp() {
    console.log(`
HypeCat HotKey - 全球热点数据采集应用

用法:
  node src/main.js [选项]

选项:
  --help, -h         显示帮助信息
  --version, -v      显示版本信息
  --once, -o         执行单次数据收集后退出
  --status, -s       显示当前状态
  --test-db          测试数据库连接
  --create-table     显示创建数据库表的 SQL

示例:
  node src/main.js              # 启动应用
  node src/main.js --once       # 执行单次收集
  node src/main.js --status     # 查看状态
  node src/main.js --test-db    # 测试数据库

环境变量:
  NODE_ENV                     运行环境 (development/production)
  COLLECTION_INTERVAL_MINUTES  采集间隔（分钟）
  TOP_ITEMS_LIMIT             每次采集的数据限制

更多信息: https://github.com/QinBenJiaRen/hypeCatHotKey
    `);
  }

  /**
   * 显示版本信息
   */
  static showVersion() {
    console.log('HypeCat HotKey v1.0.0');
  }
}

// 命令行参数处理
async function main() {
  const args = process.argv.slice(2);
  const app = new HypeCatHotKeyApp();
  
  try {
    if (args.includes('--help') || args.includes('-h')) {
      HypeCatHotKeyApp.showHelp();
      return;
    }
    
    if (args.includes('--version') || args.includes('-v')) {
      HypeCatHotKeyApp.showVersion();
      return;
    }
    
    if (args.includes('--once') || args.includes('-o')) {
      await app.runOnce();
      process.exit(0);
      return;
    }
    
    if (args.includes('--status') || args.includes('-s')) {
      const status = app.scheduler.getStatus();
      console.log('📊 调度器状态:', JSON.stringify(status, null, 2));
      return;
    }
    
    if (args.includes('--test-db')) {
      logger.info('🔗 测试数据库连接...');
      await app.testDatabaseConnection();
      return;
    }
    
    if (args.includes('--create-table')) {
      await app.database.createTableIfNotExists();
      return;
    }
    
    // 默认启动应用
    await app.start();
    
  } catch (error) {
    logger.error('❌ 应用执行失败:', error.message);
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

export default HypeCatHotKeyApp;