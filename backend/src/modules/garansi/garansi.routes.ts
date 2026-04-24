import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendSuccess, sendCreated, sendPaginated, parsePagination } from '../../shared/utils';
import { BadRequestError, NotFoundError } from '../../shared/errors';

const claimSchema = z.object({
  garansiId: z.number().int().positive(),
  reason: z.string().min(3, 'Alasan klaim minimal 3 karakter'),
});

const claimUpdateSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'resolved']),
  resolution: z.string().optional(),
});

const router = Router();
router.use(authMiddleware);

// GET /garansi
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, type } = req.query;
    const where: any = {};
    if (status && status !== 'semua') where.status = status;
    if (type) where.type = type;
    const data = await prisma.garansi.findMany({
      where, orderBy: { endDate: 'asc' },
      include: {
        spk: { include: { pelanggan: true, kendaraan: true } },
        claims: true,
      },
    });
    // Calculate daysLeft and update status
    const now = new Date();
    const enriched = data.map(g => {
      const diffMs = g.endDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      let computedStatus = g.status;
      if (daysLeft <= 0) computedStatus = 'expired';
      else if (daysLeft <= 7) computedStatus = 'hampir';
      else computedStatus = 'aktif';
      return { ...g, daysLeft, computedStatus };
    });
    sendSuccess(res, enriched);
  } catch (e) { next(e); }
});

// POST /garansi/sync-status — Auto-update garansi statuses in DB
router.post('/sync-status', requireRole('Admin'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const almostExpiredDate = new Date();
    almostExpiredDate.setDate(now.getDate() + 7);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Set expired (endDate <= now)
      const updateExpired = await tx.garansi.updateMany({
        where: { endDate: { lte: now }, status: { not: 'expired' } },
        data: { status: 'expired' },
      });

      // 2. Set hampir expired (now < endDate <= now + 7 days)
      const updateHampir = await tx.garansi.updateMany({
        where: { endDate: { gt: now, lte: almostExpiredDate }, status: { notIn: ['expired', 'hampir'] } },
        data: { status: 'hampir' },
      });

      // 3. Set aktif (endDate > now + 7 days)
      const updateAktif = await tx.garansi.updateMany({
        where: { endDate: { gt: almostExpiredDate }, status: { not: 'aktif' } },
        data: { status: 'aktif' },
      });

      return {
        expired: updateExpired.count,
        hampir: updateHampir.count,
        aktif: updateAktif.count
      };
    });

    sendSuccess(res, result, 'Sinkronisasi status garansi berhasil');
  } catch (e) { next(e); }
});

// GET /garansi/claims
router.get('/claims', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.garansiClaim.findMany({
      orderBy: { createdAt: 'desc' },
      include: { garansi: { include: { spk: { include: { pelanggan: true } } } } },
    });
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

// POST /garansi/claim
router.post('/claim', validate(claimSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { garansiId, reason } = req.body;
    
    // Validasi apakah garansi sudah expired
    const garansi = await prisma.garansi.findUnique({ where: { id: garansiId } });
    if (!garansi) throw new NotFoundError('Garansi');
    if (garansi.endDate < new Date() || garansi.status === 'expired') {
      throw new BadRequestError('Masa berlaku garansi ini sudah habis dan tidak dapat diklaim lagi.');
    }

    const claim = await prisma.garansiClaim.create({
      data: { garansiId, reason },
    });
    sendCreated(res, claim, 'Klaim garansi berhasil dibuat');
  } catch (e) { next(e); }
});

// PUT /garansi/claim/:id — resolve claim
router.put('/claim/:id', requireRole('Admin'), validate(claimUpdateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.garansiClaim.update({
      where: { id: Number(req.params.id) },
      data: { status: req.body.status, resolution: req.body.resolution },
    });
    sendSuccess(res, data, 'Klaim berhasil diperbarui');
  } catch (e) { next(e); }
});

export default router;
