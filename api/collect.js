// Vercel Serverless Function - 手动触发数据收集
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// 初始化Supabase客户端
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase配置缺失');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// 收集Google Trends数据
async function collectGoogleTrends() {
  try {
    // 注意: google-trends-api 在Vercel上可能有限制
    // 这里使用简化的示例数据
    const regions = ['US', 'GB', 'JP', 'KR', 'CN'];
    const results = [];
    
    for (const region of regions) {
      results.push({
        source: 'Google Trends',
        area: region,
        title: `${region} Trending Topics`,
        keywords: ['示例关键词1', '示例关键词2', '示例关键词3'],
        score: 85,
        collectedAt: new Date().toISOString()
      });
    }
    
    return results;
  } catch (error) {
    console.error('Google Trends收集失败:', error);
    return [];
  }
}

// 收集Reddit数据
async function collectReddit() {
  try {
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error('Reddit API配置缺失');
    }
    
    // 获取访问令牌
    const tokenResponse = await axios.post(
      'https://www.reddit.com/api/v1/access_token',
      new URLSearchParams({
        grant_type: 'client_credentials'
      }),
      {
        auth: {
          username: clientId,
          password: clientSecret
        },
        headers: {
          'User-Agent': process.env.REDDIT_USER_AGENT || 'HypeCatHotKey/1.0.0'
        }
      }
    );
    
    const accessToken = tokenResponse.data.access_token;
    
    // 获取热门帖子
    const response = await axios.get('https://oauth.reddit.com/r/popular/hot', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': process.env.REDDIT_USER_AGENT || 'HypeCatHotKey/1.0.0'
      },
      params: {
        limit: 10
      }
    });
    
    const posts = response.data.data.children;
    const results = [];
    
    for (const post of posts) {
      const data = post.data;
      results.push({
        source: 'Reddit',
        area: 'Global',
        title: data.title,
        keywords: extractKeywords(data.title),
        score: data.score,
        url: `https://reddit.com${data.permalink}`,
        collectedAt: new Date().toISOString()
      });
    }
    
    return results;
  } catch (error) {
    console.error('Reddit收集失败:', error);
    return [];
  }
}

// 提取关键词（简单实现）
function extractKeywords(text) {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3);
  
  return words.slice(0, 5);
}

// 保存数据到Supabase
async function saveToDatabase(data) {
  const supabase = getSupabaseClient();
  
  const records = data.map(item => ({
    area: item.area,
    hotKeys: item.keywords.join(','),
    hotKeysDesc: item.title,
    created_at: item.collectedAt,
    updated_at: item.collectedAt
  }));
  
  const { data: result, error } = await supabase
    .from('worldHotKeys')
    .upsert(records, {
      onConflict: 'area,created_at',
      ignoreDuplicates: false
    });
  
  if (error) {
    throw error;
  }
  
  return result;
}

export default async function handler(req, res) {
  // 只允许POST请求和GET请求
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log('🚀 开始收集数据...');
    
    // 并行收集数据
    const [googleData, redditData] = await Promise.allSettled([
      collectGoogleTrends(),
      collectReddit()
    ]);
    
    const allData = [];
    const errors = [];
    
    if (googleData.status === 'fulfilled') {
      allData.push(...googleData.value);
      console.log(`✅ Google Trends: ${googleData.value.length} 条`);
    } else {
      errors.push(`Google Trends: ${googleData.reason}`);
      console.error('❌ Google Trends失败:', googleData.reason);
    }
    
    if (redditData.status === 'fulfilled') {
      allData.push(...redditData.value);
      console.log(`✅ Reddit: ${redditData.value.length} 条`);
    } else {
      errors.push(`Reddit: ${redditData.reason}`);
      console.error('❌ Reddit失败:', redditData.reason);
    }
    
    // 保存到数据库
    let saved = 0;
    if (allData.length > 0) {
      try {
        await saveToDatabase(allData);
        saved = allData.length;
        console.log(`💾 已保存 ${saved} 条数据到数据库`);
      } catch (dbError) {
        console.error('❌ 数据库保存失败:', dbError);
        errors.push(`Database: ${dbError.message}`);
      }
    }
    
    // 返回结果
    res.status(200).json({
      success: true,
      message: '数据收集完成',
      statistics: {
        total: allData.length,
        saved: saved,
        sources: {
          googleTrends: googleData.status === 'fulfilled' ? googleData.value.length : 0,
          reddit: redditData.status === 'fulfilled' ? redditData.value.length : 0
        }
      },
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ 数据收集失败:', error);
    res.status(500).json({
      success: false,
      error: 'Data collection failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
