/**
 * 日志工具类
 */
import { formatDateTime } from './helpers.js';

class Logger {
  constructor(options = {}) {
    this.logLevel = options.logLevel || 'info';
    this.enableConsole = options.enableConsole !== false;
    this.enableFile = options.enableFile || false;
    this.logFilePath = options.logFilePath || './logs/app.log';
    
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };
  }

  /**
   * 格式化日志消息
   * @param {string} level 
   * @param {string} message 
   * @param {*} data 
   * @returns {string}
   */
  formatMessage(level, message, data = null) {
    const timestamp = formatDateTime(new Date());
    const levelStr = level.toUpperCase().padEnd(5);
    
    let logMessage = `[${timestamp}] ${levelStr} ${message}`;
    
    if (data !== null && data !== undefined) {
      if (typeof data === 'object') {
        logMessage += '\n' + JSON.stringify(data, null, 2);
      } else {
        logMessage += ` ${data}`;
      }
    }
    
    return logMessage;
  }

  /**
   * 写入日志
   * @param {string} level 
   * @param {string} message 
   * @param {*} data 
   */
  log(level, message, data = null) {
    if (this.levels[level] > this.levels[this.logLevel]) {
      return;
    }
    
    const formattedMessage = this.formatMessage(level, message, data);
    
    if (this.enableConsole) {
      this.writeToConsole(level, formattedMessage);
    }
    
    if (this.enableFile) {
      this.writeToFile(formattedMessage);
    }
  }

  /**
   * 写入控制台
   * @param {string} level 
   * @param {string} message 
   */
  writeToConsole(level, message) {
    switch (level) {
      case 'error':
        console.error(message);
        break;
      case 'warn':
        console.warn(message);
        break;
      case 'debug':
        console.debug(message);
        break;
      default:
        console.log(message);
    }
  }

  /**
   * 写入文件（简单实现）
   * @param {string} message 
   */
  writeToFile(message) {
    // 这里可以实现文件写入逻辑
    // 为了简单起见，暂时不实现
    console.log('📝 Log to file:', message);
  }

  /**
   * 错误日志
   * @param {string} message 
   * @param {*} data 
   */
  error(message, data = null) {
    this.log('error', message, data);
  }

  /**
   * 警告日志
   * @param {string} message 
   * @param {*} data 
   */
  warn(message, data = null) {
    this.log('warn', message, data);
  }

  /**
   * 信息日志
   * @param {string} message 
   * @param {*} data 
   */
  info(message, data = null) {
    this.log('info', message, data);
  }

  /**
   * 调试日志
   * @param {string} message 
   * @param {*} data 
   */
  debug(message, data = null) {
    this.log('debug', message, data);
  }

  /**
   * API 请求日志
   * @param {string} method 
   * @param {string} url 
   * @param {number} status 
   * @param {number} duration 
   */
  apiRequest(method, url, status, duration) {
    const message = `${method.toUpperCase()} ${url} - ${status} (${duration}ms)`;
    
    if (status >= 400) {
      this.error(message);
    } else {
      this.info(message);
    }
  }

  /**
   * 数据库操作日志
   * @param {string} operation 
   * @param {string} table 
   * @param {number} affectedRows 
   * @param {number} duration 
   */
  dbOperation(operation, table, affectedRows = 0, duration = 0) {
    const message = `DB ${operation.toUpperCase()} ${table} - ${affectedRows} rows (${duration}ms)`;
    this.info(message);
  }

  /**
   * 任务执行日志
   * @param {string} taskName 
   * @param {string} status 
   * @param {number} duration 
   * @param {*} result 
   */
  taskExecution(taskName, status, duration = 0, result = null) {
    const message = `Task "${taskName}" ${status} (${duration}ms)`;
    
    if (status === 'completed') {
      this.info(message, result);
    } else if (status === 'failed') {
      this.error(message, result);
    } else {
      this.info(message);
    }
  }
}

// 创建全局日志实例
const logger = new Logger({
  logLevel: process.env.LOG_LEVEL || 'info',
  enableConsole: true,
  enableFile: false,
});

export default logger;
export { Logger };