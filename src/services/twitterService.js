import axios from 'axios';
import { apiConfig } from '../config/api.js';
import { CONSTANTS } from '../constants/index.js';

class TwitterService {
  constructor() {
    this.bearerToken = apiConfig.twitter.bearerToken;
    this.baseUrl = apiConfig.twitter.baseUrl;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: CONSTANTS.LIMITS.REQUEST_TIMEOUT,
      headers: {
        'Authorization': `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * 获取Twitter趋势数据
   * @param {string} woeid - Where On Earth ID (1为全球)
   * @returns {Promise<Array>} 趋势数据数组
   */
  async getTrends(woeid = '1') {
    try {
      if (!this.bearerToken || this.bearerToken === 'your_twitter_bearer_token_here') {
        console.warn('⚠️  Twitter Bearer Token 未配置，跳过 Twitter 数据获取');
        return [];
      }

      // 使用 Twitter API v2 获取趋势数据
      const response = await this.client.get('/2/trends/by/woeid/:id', {
        params: {
          id: woeid,
        },
      });

      const trends = response.data?.data || [];
      
      return trends.slice(0, CONSTANTS.LIMITS.TOP_ITEMS_LIMIT).map(trend => ({
        keyword: trend.trend,
        description: this.extractKeywords(trend.trend),
        area: this.getAreaFromWoeid(woeid),
        source: CONSTANTS.DATA_SOURCES.TWITTER,
        volume: trend.tweet_volume || 0,
        url: trend.url || '',
      }));
    } catch (error) {
      console.error('Twitter API 调用失败:', error.message);
      if (error.response?.status === 401) {
        console.error('Twitter API 认证失败，请检查 Bearer Token');
      }
      return [];
    }
  }

  /**
   * 从趋势标题中提取关键词
   * @param {string} trendName 
   * @returns {string}
   */
  extractKeywords(trendName) {
    // 简单的关键词提取逻辑
    const keywords = trendName
      .replace(/[#@]/g, '')
      .split(/[\s,]+/)
      .filter(word => word.length > 2)
      .slice(0, 5);
    
    return keywords.join(', ');
  }

  /**
   * 根据 WOEID 获取地区
   * @param {string} woeid 
   * @returns {string}
   */
  getAreaFromWoeid(woeid) {
    const woeidMap = {
      '1': CONSTANTS.AREAS.GLOBAL,
      '23424977': CONSTANTS.AREAS.UNITED_STATES,
      '2151330': CONSTANTS.AREAS.CHINA,
      // 可以添加更多地区映射
    };
    
    return woeidMap[woeid] || CONSTANTS.AREAS.GLOBAL;
  }
}

export default TwitterService;