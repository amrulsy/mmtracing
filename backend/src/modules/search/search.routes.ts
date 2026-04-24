import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { authMiddleware } from '../../middleware/auth';
import { sendSuccess } from '../../shared/utils';

const router = Router();
router.use(authMiddleware);

// GET /search?q=keyword
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string || '').trim();

    // Minimum 2 karakter, otherwise return empty
    if (q.length < 2) {
      return sendSuccess(res, { pelanggan: [], kendaraan: [], spk: [] });
    }

    const [pelanggan, kendaraan, spk] = await Promise.all([
      // Pelanggan: name atau phone mengandung keyword
      prisma.pelanggan.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { phone: { contains: q } },
          ],
        },
        select: { id: true, name: true, phone: true },
        take: 5,
        orderBy: { updatedAt: 'desc' },
      }),

      // Kendaraan: name atau plat mengandung keyword, include pelanggan.name
      prisma.kendaraan.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { plat: { contains: q } },
          ],
        },
        select: {
          id: true,
          name: true,
          plat: true,
          pelanggan: { select: { name: true } },
        },
        take: 5,
        orderBy: { updatedAt: 'desc' },
      }),

      // SPK: noSpk mengandung keyword, atau relasi pelanggan.name / kendaraan.plat
      prisma.spk.findMany({
        where: {
          OR: [
            { noSpk: { contains: q } },
            { pelanggan: { name: { contains: q } } },
            { kendaraan: { plat: { contains: q } } },
          ],
        },
        select: {
          id: true,
          noSpk: true,
          status: true,
          pelanggan: { select: { name: true } },
          kendaraan: { select: { plat: true } },
        },
        take: 5,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    sendSuccess(res, { pelanggan, kendaraan, spk });
  } catch (e) {
    next(e);
  }
});

export default router;
