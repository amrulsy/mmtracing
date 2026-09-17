import app from './app';
import { env } from './config/env';
import logger from './config/logger';

const PORT = env.port;

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 MMT Racing API running on port ${PORT}`);
  logger.info(`📍 Environment: ${env.nodeEnv}`);
  logger.info(`🔗 API URL: ${env.appUrl}/api/v1`);
  logger.info(`🌐 Frontend URL: ${env.frontendUrl}`);
});
