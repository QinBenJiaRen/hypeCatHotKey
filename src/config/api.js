import dotenv from 'dotenv';

dotenv.config();

export const apiConfig = {
  twitter: {
    bearerToken: process.env.TWITTER_BEARER_TOKEN,
    baseUrl: 'https://api.twitter.com/2',
  },
  reddit: {
    clientId: process.env.REDDIT_CLIENT_ID,
    clientSecret: process.env.REDDIT_CLIENT_SECRET,
    userAgent: process.env.REDDIT_USER_AGENT || 'HypeCatHotKey/1.0.0',
    baseUrl: 'https://www.reddit.com',
  },
  googleTrends: {
    // Google Trends API 不需要 API Key，但可能需要处理反爬虫
    baseUrl: 'https://trends.google.com',
  },
};

export const appConfig = {
  collectionInterval: parseInt(process.env.COLLECTION_INTERVAL_MINUTES || '30'),
  topItemsLimit: parseInt(process.env.TOP_ITEMS_LIMIT || '10'),
  nodeEnv: process.env.NODE_ENV || 'development',
};

export default {
  ...apiConfig,
  app: appConfig,
};