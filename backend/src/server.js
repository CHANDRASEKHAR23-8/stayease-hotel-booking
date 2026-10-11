import app from './app.js';
import env from './config/env.js';
import { testConnection } from './config/database.js';

async function startServer() {
  console.log(`[StayEase] Starting server in ${env.nodeEnv} mode...`);

  // Verify database connection at startup
  await testConnection();

  const server = app.listen(env.port, () => {
    console.log(`====================================================`);
    console.log(`  StayEase API Server running on port ${env.port}`);
    console.log(`  Health Check: http://localhost:${env.port}/api/v1/health`);
    console.log(`  API Base URL: http://localhost:${env.port}/api/v1`);
    console.log(`====================================================`);
  });

  // Graceful shutdown handling
  const shutdown = () => {
    console.log('[StayEase] Shutting down gracefully...');
    server.close(() => {
      console.log('[StayEase] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('[StayEase Fatal Startup Error]:', err);
  process.exit(1);
});
