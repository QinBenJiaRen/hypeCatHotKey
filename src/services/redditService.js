import axios from 'axios';
import { apiConfig } from '../config/api.js';
import { CONSTANTS } from '../constants/index.js';

class RedditService {
  constructor() {
    this.clientId = apiConfig.reddit.clientId;
    this.clientSecret = apiConfig.reddit.clientSecret;
    this.userAgent = apiConfig.reddit.userAgent;
    this.baseUrl = apiConfig.reddit.baseUrl;
    this.accessToken = null;
    this.tokenExpiry = null;
    this.oauthToken = null; // 用于存储OAuth访问令牌
  }

  /**
   * 设置OAuth访问令牌
   * @param {string} token 
   */
  setOAuthToken(token) {
    this.oauthToken = token;
  }

  /**
   * 获取 Reddit 访问令牌
   * @returns {Promise<string>}
   */
  async getAccessToken() {
    try {
      if (!this.clientId || this.clientId === 'your_reddit_client_id_here') {
        console.warn('⚠️  Reddit Client ID 未配置，跳过 Reddit 数据获取');
        return null;
      }

      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post(
        'https://www.reddit.com/api/v1/access_token',
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': this.userAgent,
          },
          timeout: CONSTANTS.LIMITS.REQUEST_TIMEOUT,
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      
      return this.accessToken;
    } catch (error) {
      console.error('Reddit 访问令牌获取失败:', error.message);
      return null;
    }
  }

  /**
   * 获取 Reddit 热门帖子
   * @param {string} subreddit - 子版块名称，默认为 'popular'
   * @param {number} limit - 获取数量限制
   * @returns {Promise<Array>}
   */
  async getHotPosts(subreddit = 'popular', limit = CONSTANTS.LIMITS.TOP_ITEMS_LIMIT) {
    try {
      let accessToken;
      let baseUrl;
      
      // 优先使用OAuth令牌
      if (this.oauthToken) {
        accessToken = this.oauthToken;
        baseUrl = 'https://oauth.reddit.com';
      } else {
        // 回退到应用级访问令牌
        accessToken = await this.getAccessToken();
        baseUrl = 'https://oauth.reddit.com';
      }
      
      if (!accessToken) {
        return [];
      }

      const response = await axios.get(
        `${baseUrl}/r/${subreddit}/hot`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': this.userAgent,
          },
          params: {
            limit: limit,
            raw_json: 1,
          },
          timeout: CONSTANTS.LIMITS.REQUEST_TIMEOUT,
        }
      );

      const posts = response.data?.data?.children || [];
      
      return posts.map(post => {
        const data = post.data;
        return {
          keyword: data.title,
          description: this.extractKeywords(data.title, data.selftext),
          area: this.getAreaFromSubreddit(subreddit),
          source: CONSTANTS.DATA_SOURCES.REDDIT,
          score: data.score || 0,
          comments: data.num_comments || 0,
          url: `https://reddit.com${data.permalink}`,
          subreddit: data.subreddit,
        };
      });
    } catch (error) {
      console.error('Reddit API 调用失败:', error.message);
      return [];
    }
  }

  /**
   * 从标题和内容中提取关键词
   * @param {string} title 
   * @param {string} content 
   * @returns {string}
   */
  extractKeywords(title, content = '') {
    const text = `${title} ${content}`.toLowerCase();
    
    // 移除常见的停用词
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'are', 'as', 'was', 'were',
      'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
      'could', 'can', 'may', 'might', 'must', 'shall', 'of', 'in', 'for', 'with', 'by'
    ]);
    
    const keywords = text
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 5);
    
    return keywords.join(', ');
  }

  /**
   * 根据子版块获取地区
   * @param {string} subreddit 
   * @returns {string}
   */
  getAreaFromSubreddit(subreddit) {
    const areaMap = {
      'popular': CONSTANTS.AREAS.GLOBAL,
      'worldnews': CONSTANTS.AREAS.GLOBAL,
      'news': CONSTANTS.AREAS.UNITED_STATES,
      'europe': CONSTANTS.AREAS.EUROPE,
      'asia': CONSTANTS.AREAS.ASIA,
      'china': CONSTANTS.AREAS.CHINA,
      // 可以添加更多子版块到地区的映射
    };
    
    return areaMap[subreddit.toLowerCase()] || CONSTANTS.AREAS.GLOBAL;
  }

  /**
   * 获取多个子版块的热门内容
   * @returns {Promise<Array>}
   */
  async getAllHotPosts() {
    const subreddits = ['popular', 'worldnews', 'news', 'technology'];
    const allPosts = [];

    for (const subreddit of subreddits) {
      try {
        const posts = await this.getHotPosts(subreddit, 5);
        allPosts.push(...posts);
        
        // 添加延迟以避免频率限制
        await new Promise(resolve => setTimeout(resolve, CONSTANTS.LIMITS.RATE_LIMIT_DELAY));
      } catch (error) {
        console.error(`获取 ${subreddit} 数据失败:`, error.message);
      }
    }

    return allPosts.slice(0, CONSTANTS.LIMITS.TOP_ITEMS_LIMIT);
  }
}

export default RedditService;