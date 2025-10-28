// Vercel Cron Job - 定时收集数据
// 在 vercel.json 中配置 cron 触发器

export default async function handler(req, res) {
  // 验证是否为Vercel Cron触发
  const authHeader = req.headers.authorization;
  
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    // 调用数据收集API
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    const response = await fetch(`${baseUrl}/api/collect`, {
      method: 'POST'
    });
    
    const result = await response.json();
    
    console.log('⏰ Cron job executed:', result);
    
    res.status(200).json({
      message: 'Cron job executed successfully',
      result: result
    });
  } catch (error) {
    console.error('❌ Cron job failed:', error);
    res.status(500).json({
      error: 'Cron job failed',
      message: error.message
    });
  }
}
