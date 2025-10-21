import googleTrends from 'google-trends-api';
import { CONSTANTS } from '../constants/index.js';

class GoogleTrendsService {
  constructor() {
    this.geo = 'US'; // 默认地区
  }

  /**
   * 获取 Google 趋势数据
   * @param {string} geo - 地理位置代码 (US, CN, GB 等)
   * @returns {Promise<Array>}
   */
  async getTrends(geo = 'US') {
    try {
      // 获取当日热门搜索
      const response = await googleTrends.dailyTrends({
        trendDate: new Date(),
        geo: geo,
      });

      const trendsData = JSON.parse(response);
      const trendingSearches = trendsData?.default?.trendingSearchesDays?.[0]?.trendingSearches || [];

      const trends = trendingSearches.slice(0, CONSTANTS.LIMITS.TOP_ITEMS_LIMIT).map(trend => ({
        keyword: trend.title?.query || '',
        description: this.extractKeywords(trend.title?.query, trend.formattedTraffic),
        area: this.getAreaFromGeo(geo),
        source: CONSTANTS.DATA_SOURCES.GOOGLE_TRENDS,
        traffic: trend.formattedTraffic || '0',
        articles: trend.articles?.length || 0,
        url: trend.articles?.[0]?.url || '',
      }));

      return trends;
    } catch (error) {
      console.error('Google Trends API 调用失败:', error.message);
      
      // 如果 API 调用失败，返回模拟数据以供测试
      return this.getMockTrends(geo);
    }
  }

  /**
   * 获取多个地区的趋势数据
   * @returns {Promise<Array>}
   */
  async getAllTrends() {
    const geoList = ['US', 'CN', 'GB', 'DE', 'JP', 'IN'];
    const allTrends = [];

    for (const geo of geoList) {
      try {
        const trends = await this.getTrends(geo);
        allTrends.push(...trends);
        
        // 添加延迟以避免频率限制
        await new Promise(resolve => setTimeout(resolve, CONSTANTS.LIMITS.RATE_LIMIT_DELAY * 2));
      } catch (error) {
        console.error(`获取 ${geo} 地区趋势失败:`, error.message);
      }
    }

    return allTrends.slice(0, CONSTANTS.LIMITS.TOP_ITEMS_LIMIT);
  }

  /**
   * 从关键词中提取描述
   * @param {string} keyword 
   * @param {string} traffic 
   * @returns {string}
   */
  extractKeywords(keyword, traffic) {
    if (!keyword) return '';
    
    const words = keyword
      .toLowerCase()
      .split(/[\s,]+/)
      .filter(word => word.length > 2)
      .slice(0, 3);
    
    return `${words.join(', ')} (${traffic || '搜索量未知'})`;
  }

  /**
   * 根据地理代码获取地区
   * @param {string} geo 
   * @returns {string}
   */
  getAreaFromGeo(geo) {
    const geoMap = {
      'US': CONSTANTS.AREAS.UNITED_STATES,
      'CN': CONSTANTS.AREAS.CHINA,
      'GB': CONSTANTS.AREAS.EUROPE,
      'DE': CONSTANTS.AREAS.EUROPE,
      'FR': CONSTANTS.AREAS.EUROPE,
      'JP': CONSTANTS.AREAS.ASIA,
      'IN': CONSTANTS.AREAS.ASIA,
      'AU': CONSTANTS.AREAS.OCEANIA,
      'BR': CONSTANTS.AREAS.SOUTH_AMERICA,
      'ZA': CONSTANTS.AREAS.AFRICA,
    };
    
    return geoMap[geo] || CONSTANTS.AREAS.GLOBAL;
  }

  /**
   * 获取模拟趋势数据（用于测试）
   * @param {string} geo 
   * @returns {Array}
   */
  getMockTrends(geo) {
    const mockData = {
      'US': [
        { keyword: 'ChatGPT Updates', description: 'AI, Technology, News' },
        { keyword: 'Climate Summit 2025', description: 'Environment, Global, Politics' },
        { keyword: 'iPhone 17 Release', description: 'Apple, Technology, Mobile' },
      ],
      'CN': [
        { keyword: '春节放假安排', description: '节日, 假期, 政策' },
        { keyword: '新能源汽车', description: '汽车, 环保, 科技' },
        { keyword: '人工智能发展', description: 'AI, 科技, 未来' },
      ],
      'GB': [
        { keyword: 'Premier League', description: 'Football, Sports, UK' },
        { keyword: 'Brexit Impact', description: 'Politics, Economy, EU' },
        { keyword: 'Royal Family', description: 'Monarchy, News, Culture' },
      ],
    };

    const defaultData = mockData[geo] || mockData['US'];
    
    return defaultData.map(item => ({
      ...item,
      area: this.getAreaFromGeo(geo),
      source: CONSTANTS.DATA_SOURCES.GOOGLE_TRENDS,
      traffic: 'Mock Data',
      articles: 1,
      url: 'https://trends.google.com',
    }));
  }
}

export default GoogleTrendsService;