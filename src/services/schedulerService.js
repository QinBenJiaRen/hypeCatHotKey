import cron from 'node-cron';
import DataCollectorService from './dataCollectorService.js';
import { appConfig } from '../config/api.js';

class SchedulerService {
  constructor() {
    this.dataCollector = new DataCollectorService();
    this.tasks = new Map();
    this.isRunning = false;
  }

  /**
   * 启动定时任务
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  调度器已经在运行中');
      return;
    }

    console.log('🚀 启动热点数据采集调度器...');
    
    // 立即执行一次数据收集
    this.executeDataCollection();

    // 设置主要的数据收集任务
    this.scheduleDataCollection();
    
    // 设置数据清理任务
    this.scheduleDataCleanup();

    // 设置状态报告任务
    this.scheduleStatusReport();

    this.isRunning = true;
    console.log('✅ 调度器启动成功');
  }

  /**
   * 停止定时任务
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️  调度器未在运行');
      return;
    }

    console.log('🛑 停止调度器...');
    
    // 停止所有任务
    this.tasks.forEach((task, name) => {
      if (task) {
        task.stop();
        console.log(`📴 已停止任务: ${name}`);
      }
    });
    
    this.tasks.clear();
    this.isRunning = false;
    
    console.log('✅ 调度器已停止');
  }

  /**
   * 安排数据收集任务
   */
  scheduleDataCollection() {
    const interval = appConfig.collectionInterval || 30;
    const cronExpression = `*/${interval} * * * *`; // 每N分钟执行一次
    
    console.log(`📅 设置数据收集任务: 每 ${interval} 分钟执行一次`);
    
    const task = cron.schedule(cronExpression, async () => {
      await this.executeDataCollection();
    }, {
      scheduled: false,
      timezone: 'Asia/Shanghai'
    });
    
    this.tasks.set('dataCollection', task);
    task.start();
  }

  /**
   * 安排数据清理任务
   */
  scheduleDataCleanup() {
    // 每天凌晨2点执行数据清理
    const cronExpression = '0 2 * * *';
    
    console.log('📅 设置数据清理任务: 每天凌晨2点执行');
    
    const task = cron.schedule(cronExpression, async () => {
      await this.executeDataCleanup();
    }, {
      scheduled: false,
      timezone: 'Asia/Shanghai'
    });
    
    this.tasks.set('dataCleanup', task);
    task.start();
  }

  /**
   * 安排状态报告任务
   */
  scheduleStatusReport() {
    // 每小时执行一次状态报告
    const cronExpression = '0 * * * *';
    
    console.log('📅 设置状态报告任务: 每小时执行一次');
    
    const task = cron.schedule(cronExpression, async () => {
      await this.generateStatusReport();
    }, {
      scheduled: false,
      timezone: 'Asia/Shanghai'
    });
    
    this.tasks.set('statusReport', task);
    task.start();
  }

  /**
   * 执行数据收集
   */
  async executeDataCollection() {
    const startTime = Date.now();
    console.log(`\n🔄 [${new Date().toLocaleString()}] 开始执行数据收集任务...`);
    
    try {
      const results = await this.dataCollector.collectAllData();
      const duration = Date.now() - startTime;
      
      console.log(`✅ [${new Date().toLocaleString()}] 数据收集完成 (耗时: ${duration}ms)`);
      console.log(`📊 收集结果:`);
      console.log(`   - Twitter: ${results.twitter?.length || 0} 条`);
      console.log(`   - Reddit: ${results.reddit?.length || 0} 条`);
      console.log(`   - Google Trends: ${results.googleTrends?.length || 0} 条`);
      console.log(`   - 总计: ${results.total || 0} 条`);
      
      if (results.errors && results.errors.length > 0) {
        console.log(`⚠️  错误信息:`);
        results.errors.forEach(error => console.log(`   - ${error}`));
      }
      
      return results;
    } catch (error) {
      console.error(`❌ [${new Date().toLocaleString()}] 数据收集失败:`, error.message);
      return null;
    }
  }

  /**
   * 执行数据清理
   */
  async executeDataCleanup() {
    console.log(`\n🧹 [${new Date().toLocaleString()}] 开始执行数据清理任务...`);
    
    try {
      const deletedCount = await this.dataCollector.cleanupOldData(7); // 清理7天前的数据
      console.log(`✅ [${new Date().toLocaleString()}] 数据清理完成，删除了 ${deletedCount} 条过期数据`);
      return deletedCount;
    } catch (error) {
      console.error(`❌ [${new Date().toLocaleString()}] 数据清理失败:`, error.message);
      return 0;
    }
  }

  /**
   * 生成状态报告
   */
  async generateStatusReport() {
    console.log(`\n📊 [${new Date().toLocaleString()}] 生成状态报告...`);
    
    try {
      const stats = await this.dataCollector.getCollectionStats();
      
      if (stats) {
        console.log('📈 系统状态报告:');
        console.log(`   - 数据库总记录数: ${stats.database?.totalCount || 0}`);
        console.log(`   - 地区分布:`);
        
        if (stats.database?.areaDistribution) {
          Object.entries(stats.database.areaDistribution).forEach(([area, count]) => {
            console.log(`     * ${area}: ${count} 条`);
          });
        }
        
        console.log(`   - 最后更新: ${stats.lastCollection}`);
        console.log(`   - 调度器状态: ${this.isRunning ? '运行中' : '已停止'}`);
        console.log(`   - 活跃任务数: ${this.tasks.size}`);
      }
      
      return stats;
    } catch (error) {
      console.error(`❌ [${new Date().toLocaleString()}] 状态报告生成失败:`, error.message);
      return null;
    }
  }

  /**
   * 手动执行单次数据收集
   */
  async runOnce() {
    console.log('🏃‍♂️ 手动执行单次数据收集...');
    return await this.executeDataCollection();
  }

  /**
   * 获取调度器状态
   */
  getStatus() {
    const taskStatus = {};
    this.tasks.forEach((task, name) => {
      taskStatus[name] = {
        running: task ? task.running : false,
        lastDate: task ? task.lastDate() : null,
        nextDate: task ? task.nextDate() : null,
      };
    });

    return {
      isRunning: this.isRunning,
      tasksCount: this.tasks.size,
      tasks: taskStatus,
      config: {
        collectionInterval: appConfig.collectionInterval,
        topItemsLimit: appConfig.topItemsLimit,
      },
    };
  }

  /**
   * 更新收集间隔
   * @param {number} minutes 
   */
  updateCollectionInterval(minutes) {
    if (minutes < 1 || minutes > 1440) { // 1分钟到24小时
      throw new Error('收集间隔必须在1-1440分钟之间');
    }

    // 停止现有的数据收集任务
    const dataCollectionTask = this.tasks.get('dataCollection');
    if (dataCollectionTask) {
      dataCollectionTask.stop();
      this.tasks.delete('dataCollection');
    }

    // 更新配置
    appConfig.collectionInterval = minutes;

    // 重新安排数据收集任务
    if (this.isRunning) {
      this.scheduleDataCollection();
    }

    console.log(`✅ 收集间隔已更新为 ${minutes} 分钟`);
  }
}

export default SchedulerService;