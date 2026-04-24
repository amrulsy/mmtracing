import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendSuccess, sendCreated, sendPaginated, parsePagination } from '../../shared/utils';
import { NotFoundError, BadRequestError } from '../../shared/errors';

const router = Router();
router.use(authMiddleware);

const createSchema = z.object({
  pelangganId: z.number().int().positive(),
  name: z.string().min(1),
  plat: z.string().min(1),
  tahun: z.string().optional(),
  warna: z.string().optional(),
  noRangka: z.string().optional(),
  noMesin: z.string().optional(),
  odometer: z.number().int().optional(),
});

const updateSchema = z.object({
  pelangganId: z.number().int().positive().optional(),
  name: z.string().min(1).optional(),
  plat: z.string().min(1).optional(),
  tahun: z.string().optional(),
  warna: z.string().optional(),
  noRangka: z.string().optional(),
  noMesin: z.string().optional(),
  odometer: z.number().int().optional(),
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { pelangganId, search } = req.query;
    const where: any = {};
    if (pelangganId) where.pelangganId = Number(pelangganId);
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { plat: { contains: search as string } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.kendaraan.findMany({
        where, skip, take: limit, orderBy: { updatedAt: 'desc' },
        include: { pelanggan: { select: { id: true, name: true, phone: true } } },
      }),
      prisma.kendaraan.count({ where }),
    ]);
    sendPaginated(res, data, total, page, limit);
  } catch (e) { next(e); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.kendaraan.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        pelanggan: true,
        spk: { orderBy: { createdAt: 'desc' }, take: 10, include: { mekanik: true } },
        inspeksi: { orderBy: { tanggal: 'desc' }, take: 5 },
      },
    });
    if (!data) throw new NotFoundError('Kendaraan');
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

router.post('/', validate(createSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.kendaraan.create({ data: req.body });
    await prisma.activityLog.create({ data: {
      userId: (req as any).user?.id ?? null,
      action: 'create', module: 'master',
      targetId: data.id, targetName: `${data.name} (${data.plat})`,
    }});
    sendCreated(res, data, 'Kendaraan berhasil ditambahkan');
  } catch (e) { next(e); }
});

router.put('/:id', validate(updateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.kendaraan.update({ where: { id: Number(req.params.id) }, data: req.body });
    await prisma.activityLog.create({ data: {
      userId: (req as any).user?.id ?? null,
      action: 'update', module: 'master',
      targetId: data.id, targetName: `${data.name} (${data.plat})`,
    }});
    sendSuccess(res, data, 'Kendaraan berhasil diperbarui');
  } catch (e) { next(e); }
});

router.delete('/:id', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const spkCount = await prisma.spk.count({ where: { kendaraanId: id } });
    if (spkCount > 0) {
      throw new BadRequestError(`Kendaraan ini masih terhubung dengan ${spkCount} SPK dan tidak dapat dihapus.`);
    }
    
    const kendaraan = await prisma.kendaraan.findUnique({ where: { id }, select: { name: true, plat: true } });
    await prisma.$transaction(async (tx) => {
      await tx.inspeksi.deleteMany({ where: { kendaraanId: id } });
      await tx.kendaraan.delete({ where: { id } });
      await tx.activityLog.create({ data: {
        userId: (req as any).user?.id ?? null,
        action: 'delete', module: 'master',
        targetId: id, targetName: `${kendaraan?.name} (${kendaraan?.plat})`,
      }});
    });
    
    sendSuccess(res, null, 'Kendaraan berhasil dihapus');
  } catch (e) { next(e); }
});

export default router;
