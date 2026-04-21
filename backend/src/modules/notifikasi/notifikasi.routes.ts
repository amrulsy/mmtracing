import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { authMiddleware, AuthRequest } from '../../middleware/auth';
import { sendSuccess, sendPaginated, parsePagination } from '../../shared/utils';

const router = Router();
router.use(authMiddleware);

// GET /notifikasi
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { type } = req.query;
    const where: any = { OR: [{ userId: req.user!.id }, { userId: null }] };
    if (type && type !== 'semua') where.type = type;
    const [data, total, unread] = await Promise.all([
      prisma.notifikasi.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.notifikasi.count({ where }),
      prisma.notifikasi.count({ where: { ...where, isRead: false } }),
    ]);
    sendPaginated(res, data, total, page, limit, `${unread} belum dibaca`);
  } catch (e) { next(e); }
});

// PUT /notifikasi/read — mark all as read
router.put('/read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.notifikasi.updateMany({
      where: { OR: [{ userId: req.user!.id }, { userId: null }], isRead: false },
      data: { isRead: true },
    });
    sendSuccess(res, null, 'Semua notifikasi ditandai dibaca');
  } catch (e) { next(e); }
});

// PUT /notifikasi/:id/read  — mark single as read
router.put('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.notifikasi.update({ where: { id: Number(req.params.id) }, data: { isRead: true } });
    sendSuccess(res, null, 'Notifikasi ditandai dibaca');
  } catch (e) { next(e); }
});

export default router;
