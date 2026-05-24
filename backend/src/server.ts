import app from './app';
import { env } from './config/env';
import logger from './config/logger';
import { startCronJobs } from './jobs';

const PORT = env.port;

app.listen(PORT, () => {
  logger.info(`🚀 MMT Racing API running on port ${PORT}`);
  logger.info(`📍 Environment: ${env.nodeEnv}`);
  logger.info(`🔗 API URL: ${env.appUrl}/api/v1`);
  logger.info(`🌐 Frontend URL: ${env.frontendUrl}`);

  // Start cron jobs
  startCronJobs();
});
