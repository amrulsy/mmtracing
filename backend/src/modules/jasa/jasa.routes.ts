import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendSuccess, sendCreated } from '../../shared/utils';
import { NotFoundError, BadRequestError } from '../../shared/errors';

const router = Router();
router.use(authMiddleware);

const sparepartBundleSchema = z.object({
  sparepartId: z.number().int().positive(),
  qtyDefault: z.number().int().positive().default(1),
});

const createSchema = z.object({
  kode: z.string().min(1),
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

// GET /jasa — list all
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.jasa.findMany({ 
      orderBy: { name: 'asc' },
      include: {
        sparepartBundles: {
          include: {
            sparepart: true
          }
        }
      }
    });
    sendSuccess(res, data);
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
router.post('/', validate(createSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sparepartBundles, ...jasaData } = req.body;
    const data = await prisma.jasa.create({
      data: {
        ...jasaData,
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
    sendCreated(res, data, 'Jasa berhasil ditambahkan');
  } catch (e) { next(e); }
});

// PUT /jasa/:id — update with optional sparepartBundles sync
router.put('/:id', validate(updateSchema), async (req: Request, res: Response, next: NextFunction) => {
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

    sendSuccess(res, data, 'Jasa berhasil diperbarui');
  } catch (e) { next(e); }
});

// DELETE /jasa/:id — with protection
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);

    // Cek apakah jasa masih dipakai di SPK
    const usedInSpk = await prisma.spkItem.count({ where: { jasaId: id } });
    if (usedInSpk > 0) {
      throw new BadRequestError(
        `Jasa ini masih digunakan di ${usedInSpk} item SPK dan tidak dapat dihapus. Anda bisa menonaktifkan atau mengganti nama jasa ini.`
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.jasaSparepart.deleteMany({ where: { jasaId: id } });
      await tx.jasa.delete({ where: { id } });
    });

    sendSuccess(res, null, 'Jasa berhasil dihapus');
  } catch (e) { next(e); }
});

export default router;
