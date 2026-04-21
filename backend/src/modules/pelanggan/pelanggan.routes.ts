import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendSuccess, sendCreated, sendPaginated, parsePagination } from '../../shared/utils';
import { NotFoundError, BadRequestError } from '../../shared/errors';

const router = Router();
router.use(authMiddleware);

// Schemas
const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  type: z.enum(['kendaraan', 'bubut', 'both']).default('kendaraan'),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  type: z.enum(['kendaraan', 'bubut', 'both']).optional(),
  loyaltyTierId: z.number().int().optional(),
});

// GET /pelanggan
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { search, type } = req.query;
    const where: any = {};
    if (type && type !== 'semua') where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { phone: { contains: search as string } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.pelanggan.findMany({
        where, skip, take: limit, orderBy: { updatedAt: 'desc' },
        include: {
          kendaraan: true,
          loyaltyTier: true,
          _count: { select: { spk: true } },
        },
      }),
      prisma.pelanggan.count({ where }),
    ]);
    sendPaginated(res, data, total, page, limit);
  } catch (e) { next(e); }
});

// GET /pelanggan/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.pelanggan.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        kendaraan: true,
        loyaltyTier: true,
        spk: { orderBy: { createdAt: 'desc' }, take: 10, include: { mekanik: true } },
        loyaltyPoints: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!data) throw new NotFoundError('Pelanggan');
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

// POST /pelanggan
router.post('/', validate(createSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.pelanggan.create({ data: req.body });
    sendCreated(res, data, 'Pelanggan berhasil ditambahkan');
  } catch (e) { next(e); }
});

// PUT /pelanggan/:id
router.put('/:id', requireRole('Admin'), validate(updateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.pelanggan.update({ where: { id: Number(req.params.id) }, data: req.body });
    sendSuccess(res, data, 'Pelanggan berhasil diperbarui');
  } catch (e) { next(e); }
});

// DELETE /pelanggan/:id
router.delete('/:id', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    
    const spkCount = await prisma.spk.count({ where: { pelangganId: id } });
    if (spkCount > 0) {
      throw new BadRequestError(`Pelanggan ini memiliki ${spkCount} riwayat SPK dan tidak dapat dihapus.`);
    }
    
    const kendaraanCount = await prisma.kendaraan.count({ where: { pelangganId: id } });
    if (kendaraanCount > 0) {
      throw new BadRequestError(`Pelanggan ini memiliki ${kendaraanCount} kendaraan dan tidak dapat dihapus.`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.loyaltyPoint.deleteMany({ where: { pelangganId: id } });
      await tx.pelanggan.delete({ where: { id } });
    });

    sendSuccess(res, null, 'Pelanggan berhasil dihapus');
  } catch (e) { next(e); }
});

export default router;
