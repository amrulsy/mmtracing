import { Router, Request, Response } from 'express';
import { sseManager } from '../../shared/sse';
import logger from '../../config/logger';

const router = Router();

// GET /events — SSE endpoint for real-time updates
router.get('/', (req: Request, res: Response) => {
  const clientId = sseManager.addClient(res);
  logger.info(`[SSE] Client #${clientId} connected (total: ${sseManager.clientCount})`);

  req.on('close', () => {
    logger.info(`[SSE] Client #${clientId} disconnected (total: ${sseManager.clientCount})`);
  });
});

export default router;
