import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendSuccess, sendCreated, sendPaginated, parsePagination } from '../../shared/utils';
import { BadRequestError } from '../../shared/errors';

const router = Router();
router.use(authMiddleware);

const createSchema = z.object({
  kategoriId: z.number().int().positive(),
  tanggal: z.string().transform(v => new Date(v)).optional(),
  deskripsi: z.string().min(1),
  jumlah: z.number().positive(),
  metode: z.string().min(1),
  oleh: z.string().optional(),
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { kategoriId, month, year } = req.query;
    const where: any = {};
    if (kategoriId) where.kategoriId = Number(kategoriId);
    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 0, 23, 59, 59);
      where.tanggal = { gte: start, lte: end };
    }
    const [data, total] = await Promise.all([
      prisma.pengeluaran.findMany({
        where, skip, take: limit, orderBy: { tanggal: 'desc' },
        include: { kategori: true },
      }),
      prisma.pengeluaran.count({ where }),
    ]);
    sendPaginated(res, data, total, page, limit);
  } catch (e) { next(e); }
});

router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [bulanIni, bulanLalu, byKategori] = await Promise.all([
      prisma.pengeluaran.aggregate({ where: { tanggal: { gte: thisMonth } }, _sum: { jumlah: true }, _count: true }),
      prisma.pengeluaran.aggregate({ where: { tanggal: { gte: lastMonth, lte: lastMonthEnd } }, _sum: { jumlah: true } }),
      prisma.pengeluaran.groupBy({
        by: ['kategoriId'], where: { tanggal: { gte: thisMonth } },
        _sum: { jumlah: true }, _count: true,
      }),
    ]);

    const categories = await prisma.kategoriPengeluaran.findMany();
    const breakdown = byKategori.map(k => ({
      ...k,
      kategori: categories.find(c => c.id === k.kategoriId)?.name || 'Lainnya',
    }));

    sendSuccess(res, {
      bulanIni: bulanIni._sum.jumlah || 0,
      bulanIniCount: bulanIni._count,
      bulanLalu: bulanLalu._sum.jumlah || 0,
      breakdown,
    });
  } catch (e) { next(e); }
});

router.get('/categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.kategoriPengeluaran.findMany({ orderBy: { name: 'asc' } });
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

router.post('/categories', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.kategoriPengeluaran.create({ data: { name: req.body.name } });
    sendCreated(res, data);
  } catch (e) { next(e); }
});

router.put('/categories/:id', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.kategoriPengeluaran.update({
      where: { id: Number(req.params.id) },
      data: { name: req.body.name },
    });
    sendSuccess(res, data, 'Kategori berhasil diperbarui');
  } catch (e) { next(e); }
});

router.delete('/categories/:id', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const inUse = await prisma.pengeluaran.count({ where: { kategoriId: id } });
    if (inUse > 0) {
      throw new BadRequestError(`Kategori ini masih digunakan oleh ${inUse} pengeluaran dan tidak dapat dihapus.`);
    }
    await prisma.kategoriPengeluaran.delete({ where: { id } });
    sendSuccess(res, null, 'Kategori berhasil dihapus');
  } catch (e) { next(e); }
});

router.post('/', validate(createSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.pengeluaran.create({ data: req.body });
    sendCreated(res, data, 'Pengeluaran berhasil dicatat');
  } catch (e) { next(e); }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.pengeluaran.update({ where: { id: Number(req.params.id) }, data: req.body });
    sendSuccess(res, data, 'Pengeluaran berhasil diperbarui');
  } catch (e) { next(e); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.pengeluaran.delete({ where: { id: Number(req.params.id) } });
    sendSuccess(res, null, 'Pengeluaran berhasil dihapus');
  } catch (e) { next(e); }
});

export default router;
