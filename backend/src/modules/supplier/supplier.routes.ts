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

// GET /supplier — list all with sparepart count
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.supplier.findMany({
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
    sendCreated(res, data, 'Supplier berhasil ditambahkan');
  } catch (e) { next(e); }
});

// PUT /supplier/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.supplier.update({ where: { id: Number(req.params.id) }, data: req.body });
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

    await prisma.supplier.delete({ where: { id } });
    sendSuccess(res, null, 'Supplier berhasil dihapus');
  } catch (e) { next(e); }
});

export default router;
