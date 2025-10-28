// Vercel Serverless Function - 健康检查
export default async function handler(req, res) {
  res.status(200).json({
    status: 'healthy',
    service: 'HypeCat HotKey API',
    platform: 'Vercel',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    region: process.env.VERCEL_REGION || 'unknown'
  });
}
