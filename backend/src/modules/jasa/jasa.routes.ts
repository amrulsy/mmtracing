import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendSuccess, sendCreated, sendPaginated, parsePagination } from '../../shared/utils';
import { NotFoundError, BadRequestError } from '../../shared/errors';

const router = Router();
router.use(authMiddleware);

const sparepartBundleSchema = z.object({
  sparepartId: z.number().int().positive(),
  qtyDefault: z.number().int().positive().default(1),
});

const createSchema = z.object({
  kode: z.string().min(1).optional(),
  name: z.string().min(1),
  kategori: z.string().optional(),
  harga: z.number().min(0),
  estimasiWaktu: z.string().optional(),
  garansiHari: z.number().int().default(30),
  sparepartBundles: z.array(sparepartBundleSchema).optional(),
});

const updateSchema = z.object({
  kode: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  kategori: z.string().optional(),
  harga: z.number().min(0).optional(),
  estimasiWaktu: z.string().optional(),
  garansiHari: z.number().int().optional(),
  sparepartBundles: z.array(sparepartBundleSchema).optional(),
});

// GET /jasa — list all with pagination
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { search, kategori } = req.query;
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { kode: { contains: search as string } },
      ];
    }
    if (kategori) where.kategori = kategori as string;
    const [data, total] = await Promise.all([
      prisma.jasa.findMany({
        where, skip, take: limit, orderBy: { name: 'asc' },
        include: {
          sparepartBundles: { include: { sparepart: true } },
        },
      }),
      prisma.jasa.count({ where }),
    ]);
    sendPaginated(res, data, total, page, limit);
  } catch (e) { next(e); }
});

// GET /jasa/:id — detail by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.jasa.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        sparepartBundles: {
          include: { sparepart: true }
        },
        spkItems: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            spk: { select: { id: true, noSpk: true, status: true, tanggal: true } }
          }
        },
      },
    });
    if (!data) throw new NotFoundError('Jasa');
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

// POST /jasa — create with optional sparepartBundles
router.post('/', requireRole('Admin'), validate(createSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sparepartBundles, kode, ...jasaData } = req.body;
    const finalKode = kode || `JS-${Date.now().toString(36).toUpperCase().slice(-5)}`;
    const data = await prisma.jasa.create({
      data: {
        ...jasaData,
        kode: finalKode,
        sparepartBundles: sparepartBundles?.length ? {
          create: sparepartBundles.map((b: any) => ({
            sparepartId: b.sparepartId,
            qtyDefault: b.qtyDefault ?? 1,
          })),
        } : undefined,
      },
      include: {
        sparepartBundles: { include: { sparepart: true } },
      },
    });
    await prisma.activityLog.create({ data: {
      userId: (req as any).user?.id ?? null,
      action: 'create', module: 'master',
      targetId: data.id, targetName: data.name,
    }});
    sendCreated(res, data, 'Jasa berhasil ditambahkan');
  } catch (e) { next(e); }
});

// PUT /jasa/:id — update with optional sparepartBundles sync
router.put('/:id', requireRole('Admin'), validate(updateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const { sparepartBundles, ...jasaData } = req.body;

    const data = await prisma.$transaction(async (tx) => {
      // Update jasa fields
      await tx.jasa.update({ where: { id }, data: jasaData });

      // Sync sparepartBundles if provided
      if (sparepartBundles !== undefined) {
        // Delete existing bundles
        await tx.jasaSparepart.deleteMany({ where: { jasaId: id } });
        // Create new bundles
        if (sparepartBundles.length > 0) {
          await tx.jasaSparepart.createMany({
            data: sparepartBundles.map((b: any) => ({
              jasaId: id,
              sparepartId: b.sparepartId,
              qtyDefault: b.qtyDefault ?? 1,
            })),
          });
        }
      }

      return tx.jasa.findUnique({
        where: { id },
        include: { sparepartBundles: { include: { sparepart: true } } },
      });
    });

    await prisma.activityLog.create({ data: {
      userId: (req as any).user?.id ?? null,
      action: 'update', module: 'master',
      targetId: data?.id ?? id, targetName: data?.name,
    }});

    sendSuccess(res, data, 'Jasa berhasil diperbarui');
  } catch (e) { next(e); }
});

// DELETE /jasa/:id — with protection
router.delete('/:id', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);

    // Cek apakah jasa masih dipakai di SPK
    const usedInSpk = await prisma.spkItem.count({ where: { jasaId: id } });
    if (usedInSpk > 0) {
      throw new BadRequestError(
        `Jasa ini masih digunakan di ${usedInSpk} item SPK dan tidak dapat dihapus. Anda bisa menonaktifkan atau mengganti nama jasa ini.`
      );
    }

    const jasa = await prisma.jasa.findUnique({ where: { id }, select: { name: true } });
    await prisma.$transaction(async (tx) => {
      await tx.jasaSparepart.deleteMany({ where: { jasaId: id } });
      await tx.jasa.delete({ where: { id } });
      await tx.activityLog.create({ data: {
        userId: (req as any).user?.id ?? null,
        action: 'delete', module: 'master',
        targetId: id, targetName: jasa?.name,
      }});
    });

    sendSuccess(res, null, 'Jasa berhasil dihapus');
  } catch (e) { next(e); }
});

export default router;
