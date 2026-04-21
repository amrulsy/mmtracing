import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { authMiddleware } from '../../middleware/auth';
import { sendSuccess, sendPaginated, parsePagination } from '../../shared/utils';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { module: mod, action, userId, search } = req.query;
    const where: any = {};
    if (mod) where.module = mod;
    if (action) where.action = action;
    if (userId) where.userId = Number(userId);
    if (search) {
      where.OR = [
        { details: { contains: String(search) } },
        { user: { name: { contains: String(search) } } },
        { action: { contains: String(search) } }
      ];
    }
    const [data, total] = await Promise.all([
      prisma.activityLog.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, username: true } } },
      }),
      prisma.activityLog.count({ where }),
    ]);
    sendPaginated(res, data, total, page, limit);
  } catch (e) { next(e); }
});

export default router;
