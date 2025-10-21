import TwitterService from './twitterService.js';
import RedditService from './redditService.js';
import GoogleTrendsService from './googleTrendsService.js';
import DatabaseService from './databaseService.js';
import { CONSTANTS } from '../constants/index.js';

class DataCollectorService {
  constructor() {
    this.twitterService = new TwitterService();
    this.redditService = new RedditService();
    this.googleTrendsService = new GoogleTrendsService();
    this.databaseService = new DatabaseService();
  }

  /**
   * 收集所有来源的热点数据
   * @returns {Promise<Object>}
   */
  async collectAllData() {
    console.log('🚀 开始收集热点数据...');
    
    const results = {
      twitter: [],
      reddit: [],
      googleTrends: [],
      total: 0,
      errors: [],
    };

    try {
      // 并行收集数据以提高效率
      const [twitterData, redditData, googleTrendsData] = await Promise.allSettled([
        this.collectTwitterData(),
        this.collectRedditData(),
        this.collectGoogleTrendsData(),
      ]);

      // 处理 Twitter 数据结果
      if (twitterData.status === 'fulfilled') {
        results.twitter = twitterData.value;
        console.log(`📱 Twitter: 收集到 ${results.twitter.length} 条数据`);
      } else {
        results.errors.push(`Twitter: ${twitterData.reason}`);
        console.error('❌ Twitter 数据收集失败:', twitterData.reason);
      }

      // 处理 Reddit 数据结果
      if (redditData.status === 'fulfilled') {
        results.reddit = redditData.value;
        console.log(`🤖 Reddit: 收集到 ${results.reddit.length} 条数据`);
      } else {
        results.errors.push(`Reddit: ${redditData.reason}`);
        console.error('❌ Reddit 数据收集失败:', redditData.reason);
      }

      // 处理 Google Trends 数据结果
      if (googleTrendsData.status === 'fulfilled') {
        results.googleTrends = googleTrendsData.value;
        console.log(`🔍 Google Trends: 收集到 ${results.googleTrends.length} 条数据`);
      } else {
        results.errors.push(`Google Trends: ${googleTrendsData.reason}`);
        console.error('❌ Google Trends 数据收集失败:', googleTrendsData.reason);
      }

      // 合并所有数据
      const allData = [
        ...results.twitter,
        ...results.reddit,
        ...results.googleTrends,
      ];

      // 去重和过滤
      const filteredData = this.deduplicateAndFilter(allData);
      results.total = filteredData.length;

      // 保存到数据库
      if (filteredData.length > 0) {
        await this.databaseService.saveHotKeys(filteredData);
        console.log(`💾 已保存 ${filteredData.length} 条热点数据到数据库`);
      } else {
        console.log('⚠️  没有收集到任何数据');
      }

      return results;
    } catch (error) {
      console.error('❌ 数据收集过程中发生错误:', error.message);
      results.errors.push(error.message);
      return results;
    }
  }

  /**
   * 收集 Twitter 数据
   * @returns {Promise<Array>}
   */
  async collectTwitterData() {
    try {
      const trends = await this.twitterService.getTrends();
      return trends;
    } catch (error) {
      console.error('Twitter 数据收集失败:', error.message);
      return [];
    }
  }

  /**
   * 收集 Reddit 数据
   * @returns {Promise<Array>}
   */
  async collectRedditData() {
    try {
      const posts = await this.redditService.getAllHotPosts();
      return posts;
    } catch (error) {
      console.error('Reddit 数据收集失败:', error.message);
      return [];
    }
  }

  /**
   * 收集 Google Trends 数据
   * @returns {Promise<Array>}
   */
  async collectGoogleTrendsData() {
    try {
      const trends = await this.googleTrendsService.getAllTrends();
      return trends;
    } catch (error) {
      console.error('Google Trends 数据收集失败:', error.message);
      return [];
    }
  }

  /**
   * 去重和过滤数据
   * @param {Array} data 
   * @returns {Array}
   */
  deduplicateAndFilter(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    // 创建去重映射
    const uniqueData = new Map();

    data.forEach(item => {
      if (!item.keyword || typeof item.keyword !== 'string') {
        return;
      }

      // 标准化关键词作为去重键
      const normalizedKey = this.normalizeKeyword(item.keyword);
      const key = `${item.area || CONSTANTS.AREAS.GLOBAL}_${normalizedKey}`;

      // 如果已存在相同的键，选择质量更好的数据
      if (uniqueData.has(key)) {
        const existing = uniqueData.get(key);
        if (this.compareDataQuality(item, existing) > 0) {
          uniqueData.set(key, item);
        }
      } else {
        uniqueData.set(key, item);
      }
    });

    // 转换回数组并按质量排序
    const result = Array.from(uniqueData.values())
      .filter(item => this.isValidHotKey(item))
      .sort((a, b) => this.compareDataQuality(b, a))
      .slice(0, CONSTANTS.LIMITS.TOP_ITEMS_LIMIT);

    console.log(`🔧 数据处理完成: 原始 ${data.length} 条 → 去重后 ${uniqueData.size} 条 → 最终 ${result.length} 条`);
    
    return result;
  }

  /**
   * 标准化关键词
   * @param {string} keyword 
   * @returns {string}
   */
  normalizeKeyword(keyword) {
    return keyword
      .toLowerCase()
      .trim()
      .replace(/[^\w\s\u4e00-\u9fff]/g, '') // 保留字母、数字、空格和中文
      .replace(/\s+/g, ' ');
  }

  /**
   * 比较数据质量
   * @param {Object} a 
   * @param {Object} b 
   * @returns {number}
   */
  compareDataQuality(a, b) {
    // 优先级：描述质量 > 数据完整性 > 来源可信度
    
    const scoreA = this.calculateDataScore(a);
    const scoreB = this.calculateDataScore(b);
    
    return scoreA - scoreB;
  }

  /**
   * 计算数据质量分数
   * @param {Object} data 
   * @returns {number}
   */
  calculateDataScore(data) {
    let score = 0;

    // 关键词质量
    if (data.keyword && data.keyword.length > 5) score += 2;
    if (data.keyword && data.keyword.length > 10) score += 1;

    // 描述质量
    if (data.description && data.description.length > 10) score += 3;
    if (data.description && data.description.length > 30) score += 2;

    // 数据来源
    const sourceScores = {
      [CONSTANTS.DATA_SOURCES.TWITTER]: 3,
      [CONSTANTS.DATA_SOURCES.REDDIT]: 2,
      [CONSTANTS.DATA_SOURCES.GOOGLE_TRENDS]: 4,
    };
    score += sourceScores[data.source] || 1;

    // 额外指标
    if (data.score || data.volume || data.traffic) score += 1;
    if (data.url && data.url.startsWith('http')) score += 1;

    return score;
  }

  /**
   * 验证热点数据是否有效
   * @param {Object} data 
   * @returns {boolean}
   */
  isValidHotKey(data) {
    // 基本字段检查
    if (!data.keyword || typeof data.keyword !== 'string') {
      return false;
    }

    // 关键词长度检查
    if (data.keyword.length < 2 || data.keyword.length > CONSTANTS.HOT_KEY_MAX_LENGTH) {
      return false;
    }

    // 过滤垃圾内容
    const spamPatterns = [
      /^[\d\s]+$/,  // 纯数字
      /^[^\w\u4e00-\u9fff]+$/,  // 纯符号
      /^\s*$/,  // 空白
    ];

    if (spamPatterns.some(pattern => pattern.test(data.keyword))) {
      return false;
    }

    return true;
  }

  /**
   * 获取收集统计信息
   * @returns {Promise<Object>}
   */
  async getCollectionStats() {
    try {
      const dbStats = await this.databaseService.getStats();
      
      return {
        database: dbStats,
        services: {
          twitter: 'Twitter API',
          reddit: 'Reddit API',
          googleTrends: 'Google Trends API',
        },
        lastCollection: new Date().toISOString(),
      };
    } catch (error) {
      console.error('获取统计信息失败:', error.message);
      return null;
    }
  }

  /**
   * 清理过期数据
   * @param {number} daysOld 
   * @returns {Promise<number>}
   */
  async cleanupOldData(daysOld = 7) {
    try {
      return await this.databaseService.cleanupOldData(daysOld);
    } catch (error) {
      console.error('清理过期数据失败:', error.message);
      return 0;
    }
  }
}

export default DataCollectorService;