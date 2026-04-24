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
  kode: z.string().min(1),
  name: z.string().min(1),
  merk: z.string().optional(),
  kategoriId: z.number().int().positive().optional(),
  supplierId: z.number().int().positive().optional(),
  hargaBeli: z.number().min(0),
  hargaJual: z.number().min(0),
  stok: z.number().int().min(0).default(0),
  stokMinimum: z.number().int().min(0).default(5),
  satuan: z.string().default('pcs'),
  lokasi: z.string().optional(),
});

const updateSchema = z.object({
  kode: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  merk: z.string().optional(),
  kategoriId: z.number().int().positive().optional(),
  supplierId: z.number().int().positive().optional(),
  hargaBeli: z.number().min(0).optional(),
  hargaJual: z.number().min(0).optional(),
  stokMinimum: z.number().int().min(0).optional(),
  satuan: z.string().optional(),
  lokasi: z.string().optional(),
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { search, kategoriId, lowStock } = req.query;
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { kode: { contains: search as string } },
        { merk: { contains: search as string } },
      ];
    }
    if (kategoriId) where.kategoriId = Number(kategoriId);
    if (lowStock === 'true') where.AND = [{ stok: { gt: 0 } }]; // handled via raw on /low-stock endpoint
    const [data, total] = await Promise.all([
      prisma.sparepart.findMany({
        where, skip, take: limit, orderBy: { name: 'asc' },
        include: { kategori: true, supplier: true },
      }),
      prisma.sparepart.count({ where }),
    ]);
    sendPaginated(res, data, total, page, limit);
  } catch (e) { next(e); }
});

router.get('/low-stock', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.$queryRaw`SELECT * FROM sparepart WHERE stok <= stokMinimum ORDER BY stok ASC`;
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

router.get('/categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.kategoriSparepart.findMany({ orderBy: { name: 'asc' } });
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

router.post('/categories', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.kategoriSparepart.create({ data: { name: req.body.name } });
    await prisma.activityLog.create({ data: {
      userId: (req as any).user?.id ?? null,
      action: 'create_kategori', module: 'master',
      targetId: data.id, targetName: data.name,
    }});
    sendCreated(res, data);
  } catch (e) { next(e); }
});

router.put('/categories/:id', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.kategoriSparepart.update({
      where: { id: Number(req.params.id) },
      data: { name: req.body.name },
    });
    await prisma.activityLog.create({ data: {
      userId: (req as any).user?.id ?? null,
      action: 'update_kategori', module: 'master',
      targetId: data.id, targetName: data.name,
    }});
    sendSuccess(res, data, 'Kategori berhasil diperbarui');
  } catch (e) { next(e); }
});

router.delete('/categories/:id', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const kategori = await prisma.kategoriSparepart.findUnique({ where: { id }, select: { name: true } });
    const inUse = await prisma.sparepart.count({ where: { kategoriId: id } });
    if (inUse > 0) {
      throw new BadRequestError(`Kategori ini masih digunakan oleh ${inUse} sparepart dan tidak dapat dihapus.`);
    }
    await prisma.kategoriSparepart.delete({ where: { id } });
    await prisma.activityLog.create({ data: {
      userId: (req as any).user?.id ?? null,
      action: 'delete_kategori', module: 'master',
      targetId: id, targetName: kategori?.name,
    }});
    sendSuccess(res, null, 'Kategori berhasil dihapus');
  } catch (e) { next(e); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.sparepart.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        kategori: true, supplier: true,
        inventarisLog: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!data) throw new NotFoundError('Sparepart');
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

router.post('/', requireRole('Admin'), validate(createSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.sparepart.create({ data: req.body });
    await prisma.activityLog.create({ data: {
      userId: (req as any).user?.id ?? null,
      action: 'create', module: 'master',
      targetId: data.id, targetName: data.name,
    }});
    sendCreated(res, data, 'Sparepart berhasil ditambahkan');
  } catch (e) { next(e); }
});

router.put('/:id', requireRole('Admin'), validate(updateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.sparepart.update({ where: { id: Number(req.params.id) }, data: req.body });
    await prisma.activityLog.create({ data: {
      userId: (req as any).user?.id ?? null,
      action: 'update', module: 'master',
      targetId: data.id, targetName: data.name,
    }});
    sendSuccess(res, data, 'Sparepart berhasil diperbarui');
  } catch (e) { next(e); }
});

router.delete('/:id', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);

    // Cek apakah sparepart masih dipakai di SPK
    const usedInSpk = await prisma.spkItem.count({ where: { sparepartId: id } });
    if (usedInSpk > 0) {
      throw new BadRequestError(
        `Sparepart ini masih digunakan di ${usedInSpk} item SPK dan tidak dapat dihapus.`
      );
    }

    // Cek apakah sparepart masih jadi bundle jasa
    const usedInJasa = await prisma.jasaSparepart.count({ where: { sparepartId: id } });
    if (usedInJasa > 0) {
      throw new BadRequestError(
        `Sparepart ini masih terhubung dengan ${usedInJasa} paket jasa dan tidak dapat dihapus.`
      );
    }

    // Cek apakah sparepart memiliki riwayat opname
    const usedInOpname = await prisma.stokOpnameItem.count({ where: { sparepartId: id } });
    if (usedInOpname > 0) {
      throw new BadRequestError(
        `Sparepart ini memiliki ${usedInOpname} riwayat opname dan tidak dapat dihapus untuk menjaga integritas data.`
      );
    }

    const sp = await prisma.sparepart.findUnique({ where: { id }, select: { name: true } });
    await prisma.$transaction(async (tx) => {
      // Hapus log inventaris terkait
      await tx.inventarisLog.deleteMany({ where: { sparepartId: id } });
      await tx.sparepart.delete({ where: { id } });
      await tx.activityLog.create({ data: {
        userId: (req as any).user?.id ?? null,
        action: 'delete', module: 'master',
        targetId: id, targetName: sp?.name,
      }});
    });

    sendSuccess(res, null, 'Sparepart berhasil dihapus');
  } catch (e) { next(e); }
});

export default router;
