// 应用常量定义
export const CONSTANTS = {
  // 数据源类型
  DATA_SOURCES: {
    TWITTER: 'twitter',
    REDDIT: 'reddit',
    GOOGLE_TRENDS: 'google_trends',
  },

  // 地区分类
  AREAS: {
    GLOBAL: 'global',
    UNITED_STATES: 'united_states',
    CHINA: 'china',
    EUROPE: 'europe',
    ASIA: 'asia',
    AFRICA: 'africa',
    OCEANIA: 'oceania',
    SOUTH_AMERICA: 'south_america',
  },

  // 数据库表名
  TABLES: {
    WORLD_HOT_KEYS: 'worldHotKeys',
  },

  // 时间格式
  DATE_FORMATS: {
    ISO: 'YYYY-MM-DDTHH:mm:ss.sssZ',
    DATE_ONLY: 'YYYY-MM-DD',
    DATETIME: 'YYYY-MM-DD HH:mm:ss',
  },

  // API 限制
  LIMITS: {
    MAX_RETRIES: 3,
    REQUEST_TIMEOUT: 30000, // 30 seconds
    RATE_LIMIT_DELAY: 1000, // 1 second
  },

  // 热点关键词最大长度
  HOT_KEY_MAX_LENGTH: 100,
  HOT_KEY_DESC_MAX_LENGTH: 500,
};

export default CONSTANTS;