import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendSuccess, sendCreated } from '../../shared/utils';
import { NotFoundError, BadRequestError } from '../../shared/errors';

const router = Router();
router.use(authMiddleware);

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
});

// GET /supplier — list all with sparepart count + search
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search } = req.query;
    const where: any = search ? {
      OR: [
        { name: { contains: String(search) } },
        { phone: { contains: String(search) } },
      ],
    } : {};
    const data = await prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { sparepart: true, inventarisLog: true } } },
    });
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

// GET /supplier/:id — detail with spareparts + purchase history
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.supplier.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        sparepart: {
          orderBy: { name: 'asc' },
          include: { kategori: true },
        },
        inventarisLog: {
          orderBy: { createdAt: 'desc' },
          take: 30,
          include: { sparepart: { select: { id: true, kode: true, name: true } } },
        },
      },
    });
    if (!data) throw new NotFoundError('Supplier');
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

// POST /supplier
router.post('/', validate(createSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.supplier.create({ data: req.body });
    await prisma.activityLog.create({ data: {
      userId: (req as any).user?.id ?? null,
      action: 'create', module: 'master',
      targetId: data.id, targetName: data.name,
    }});
    sendCreated(res, data, 'Supplier berhasil ditambahkan');
  } catch (e) { next(e); }
});

// PUT /supplier/:id
router.put('/:id', validate(updateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.supplier.update({ where: { id: Number(req.params.id) }, data: req.body });
    await prisma.activityLog.create({ data: {
      userId: (req as any).user?.id ?? null,
      action: 'update', module: 'master',
      targetId: data.id, targetName: data.name,
    }});
    sendSuccess(res, data, 'Supplier berhasil diperbarui');
  } catch (e) { next(e); }
});

// PATCH /supplier/:id
router.patch('/:id', validate(updateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.supplier.update({ where: { id: Number(req.params.id) }, data: req.body });
    await prisma.activityLog.create({ data: {
      userId: (req as any).user?.id ?? null,
      action: 'update', module: 'master',
      targetId: data.id, targetName: data.name,
    }});
    sendSuccess(res, data, 'Supplier berhasil diperbarui');
  } catch (e) { next(e); }
});

// DELETE /supplier/:id — with protection
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);

    // Cek apakah supplier masih punya sparepart
    const sparepartCount = await prisma.sparepart.count({ where: { supplierId: id } });
    if (sparepartCount > 0) {
      throw new BadRequestError(
        `Supplier ini masih terhubung dengan ${sparepartCount} sparepart dan tidak dapat dihapus. Pindahkan sparepart ke supplier lain terlebih dahulu.`
      );
    }

    // Cek apakah supplier masih punya log inventaris
    const logCount = await prisma.inventarisLog.count({ where: { supplierId: id } });
    if (logCount > 0) {
      throw new BadRequestError(
        `Supplier ini memiliki ${logCount} riwayat transaksi inventaris dan tidak dapat dihapus untuk menjaga integritas data historis.`
      );
    }

    const supplier = await prisma.supplier.findUnique({ where: { id }, select: { name: true } });
    await prisma.supplier.delete({ where: { id } });
    await prisma.activityLog.create({ data: {
      userId: (req as any).user?.id ?? null,
      action: 'delete', module: 'master',
      targetId: id, targetName: supplier?.name,
    }});
    sendSuccess(res, null, 'Supplier berhasil dihapus');
  } catch (e) { next(e); }
});

export default router;
