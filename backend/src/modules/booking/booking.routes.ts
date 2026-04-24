import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { sendSuccess } from '../../shared/utils';

const router = Router();

// GET /booking — List all bookings (Admin)
router.get('/', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== 'semua') where.status = status;

    const [data, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    sendSuccess(res, {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (e) {
    next(e);
  }
});

// GET /booking/stats — Booking statistics (Admin)
router.get('/stats', authMiddleware, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, baru, dikonfirmasi, todayCount] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { status: 'baru' } }),
      prisma.booking.count({ where: { status: 'dikonfirmasi' } }),
      prisma.booking.count({ where: { createdAt: { gte: today } } }),
    ]);

    sendSuccess(res, { total, baru, dikonfirmasi, hari_ini: todayCount });
  } catch (e) {
    next(e);
  }
});

// PUT /booking/:id — Update booking status (Admin)
router.put('/:id', authMiddleware, requireRole('Admin', 'Kasir'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(String(req.params.id));
    const { status, catatan } = req.body;

    const booking = await prisma.booking.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(catatan !== undefined && { catatan }),
      },
    });

    sendSuccess(res, booking, 'Status booking diperbarui');
  } catch (e) {
    next(e);
  }
});

// DELETE /booking/:id — Delete booking (Admin)
router.delete('/:id', authMiddleware, requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(String(req.params.id));
    await prisma.booking.delete({ where: { id } });
    sendSuccess(res, null, 'Booking dihapus');
  } catch (e) {
    next(e);
  }
});

export default router;
