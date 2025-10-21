/**
 * 通用工具函数
 */

/**
 * 延迟执行
 * @param {number} ms - 延迟毫秒数
 * @returns {Promise}
 */
export const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * 重试执行函数
 * @param {Function} fn - 要执行的函数
 * @param {number} maxRetries - 最大重试次数
 * @param {number} delay - 重试间隔（毫秒）
 * @returns {Promise}
 */
export const retry = async (fn, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (i === maxRetries) {
        break;
      }
      
      console.warn(`重试 ${i + 1}/${maxRetries} 失败:`, error.message);
      await sleep(delay * Math.pow(2, i)); // 指数退避
    }
  }
  
  throw lastError;
};

/**
 * 安全的 JSON 解析
 * @param {string} jsonString 
 * @param {*} defaultValue 
 * @returns {*}
 */
export const safeJsonParse = (jsonString, defaultValue = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('JSON 解析失败:', error.message);
    return defaultValue;
  }
};

/**
 * 清理和验证 URL
 * @param {string} url 
 * @returns {string|null}
 */
export const validateUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }
  
  try {
    const urlObj = new URL(url);
    return urlObj.href;
  } catch (error) {
    return null;
  }
};

/**
 * 生成唯一 ID
 * @returns {string}
 */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * 格式化文件大小
 * @param {number} bytes 
 * @returns {string}
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * 深度克隆对象
 * @param {*} obj 
 * @returns {*}
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }
  
  if (obj instanceof Object) {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

/**
 * 获取环境变量（带默认值）
 * @param {string} key 
 * @param {*} defaultValue 
 * @returns {*}
 */
export const getEnv = (key, defaultValue = null) => {
  const value = process.env[key];
  
  if (value === undefined || value === null) {
    return defaultValue;
  }
  
  // 尝试转换布尔值
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  
  // 尝试转换数字
  if (!isNaN(value) && !isNaN(parseFloat(value))) {
    return parseFloat(value);
  }
  
  return value;
};

/**
 * 限制并发执行
 * @param {Array} tasks - 任务数组
 * @param {number} concurrency - 并发数量
 * @returns {Promise<Array>}
 */
export const limitConcurrency = async (tasks, concurrency = 3) => {
  const results = [];
  const executing = [];
  
  for (const task of tasks) {
    const promise = Promise.resolve().then(() => task()).then(result => {
      executing.splice(executing.indexOf(promise), 1);
      return result;
    });
    
    results.push(promise);
    executing.push(promise);
    
    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }
  
  return Promise.all(results);
};

/**
 * 创建防抖函数
 * @param {Function} func 
 * @param {number} delay 
 * @returns {Function}
 */
export const debounce = (func, delay) => {
  let timeoutId;
  
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

/**
 * 创建节流函数
 * @param {Function} func 
 * @param {number} delay 
 * @returns {Function}
 */
export const throttle = (func, delay) => {
  let lastCall = 0;
  
  return function (...args) {
    const now = Date.now();
    
    if (now - lastCall >= delay) {
      lastCall = now;
      return func.apply(this, args);
    }
  };
};

/**
 * 格式化日期时间
 * @param {Date|string} date 
 * @param {string} format 
 * @returns {string}
 */
export const formatDateTime = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

/**
 * 检查是否为今天
 * @param {Date|string} date 
 * @returns {boolean}
 */
export const isToday = (date) => {
  const today = new Date();
  const checkDate = new Date(date);
  
  return today.getFullYear() === checkDate.getFullYear() &&
         today.getMonth() === checkDate.getMonth() &&
         today.getDate() === checkDate.getDate();
};

export default {
  sleep,
  retry,
  safeJsonParse,
  validateUrl,
  generateId,
  formatFileSize,
  deepClone,
  getEnv,
  limitConcurrency,
  debounce,
  throttle,
  formatDateTime,
  isToday,
};