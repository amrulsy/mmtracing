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
  name: z.string().min(1),
  phone: z.string().optional(),
  spesialisasi: z.string().optional(),
  initial: z.string().max(5).optional(),
  color: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  spesialisasi: z.string().optional(),
  initial: z.string().max(5).optional(),
  color: z.string().optional(),
  status: z.enum(['available', 'busy', 'offline']).optional(),
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status) where.status = status;
    const data = await prisma.mekanik.findMany({
      where, orderBy: { name: 'asc' },
      include: {
        _count: { select: { spk: true } },
        spk: { where: { status: 'dikerjakan' }, select: { id: true, noSpk: true, status: true } },
      },
    });
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.mekanik.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        spk: { orderBy: { createdAt: 'desc' }, take: 20, include: { pelanggan: true, kendaraan: true } },
        jadwal: { orderBy: { tanggal: 'desc' }, take: 10 },
      },
    });
    if (!data) throw new NotFoundError('Mekanik');
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

router.post('/', requireRole('Admin'), validate(createSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.mekanik.create({ data: req.body });
    await prisma.activityLog.create({ data: {
      userId: (req as any).user?.id ?? null,
      action: 'create', module: 'master',
      targetId: data.id, targetName: data.name,
    }});
    sendCreated(res, data, 'Mekanik berhasil ditambahkan');
  } catch (e) { next(e); }
});

router.put('/:id', requireRole('Admin'), validate(updateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.mekanik.update({ where: { id: Number(req.params.id) }, data: req.body });
    await prisma.activityLog.create({ data: {
      userId: (req as any).user?.id ?? null,
      action: 'update', module: 'master',
      targetId: data.id, targetName: data.name,
    }});
    sendSuccess(res, data, 'Mekanik berhasil diperbarui');
  } catch (e) { next(e); }
});

router.delete('/:id', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const mekanik = await prisma.mekanik.findUnique({ where: { id }, select: { name: true } });
    const spkCount = await prisma.spk.count({ where: { mekanikId: id } });
    if (spkCount > 0) {
      throw new BadRequestError(`Mekanik ini masih terhubung dengan ${spkCount} SPK dan tidak dapat dihapus.`);
    }
    await prisma.mekanik.delete({ where: { id } });
    await prisma.activityLog.create({ data: {
      userId: (req as any).user?.id ?? null,
      action: 'delete', module: 'master',
      targetId: id, targetName: mekanik?.name,
    }});
    sendSuccess(res, null, 'Mekanik berhasil dihapus');
  } catch (e) { next(e); }
});

export default router;
