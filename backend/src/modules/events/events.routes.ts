import { Router, Request, Response } from 'express';
import { sseManager } from '../../shared/sse';

const router = Router();

// GET /events — SSE endpoint for real-time updates
router.get('/', (req: Request, res: Response) => {
  const clientId = sseManager.addClient(res);
  console.log(`[SSE] Client #${clientId} connected (total: ${sseManager.clientCount})`);

  req.on('close', () => {
    console.log(`[SSE] Client #${clientId} disconnected (total: ${sseManager.clientCount})`);
  });
});

export default router;
