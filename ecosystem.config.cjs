// PM2 进程管理配置文件
// 使用方式: pm2 start ecosystem.config.cjs

module.exports = {
  apps: [
    // OAuth授权服务器
    {
      name: 'hypecat-oauth',
      script: './src/oauth-server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'development',
        OAUTH_SERVER_PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        OAUTH_SERVER_PORT: 3000,
      },
      error_file: './logs/oauth-error.log',
      out_file: './logs/oauth-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '500M',
    },
    
    // 数据收集主应用
    {
      name: 'hypecat-collector',
      script: './src/main.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'development',
        COLLECTION_INTERVAL_MINUTES: 30,
      },
      env_production: {
        NODE_ENV: 'production',
        COLLECTION_INTERVAL_MINUTES: 30,
      },
      error_file: './logs/collector-error.log',
      out_file: './logs/collector-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '500M',
    },
  ],

  // 部署配置（可选）
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:QinBenJiaRen/hypeCatHotKey.git',
      path: '/var/www/hypecat',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.cjs --env production',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};