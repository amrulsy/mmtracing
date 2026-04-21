import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendSuccess, sendCreated, sendPaginated, parsePagination } from '../../shared/utils';
import { BadRequestError } from '../../shared/errors';

const router = Router();
router.use(authMiddleware);

const stokMasukSchema = z.object({
  sparepartId: z.number().int().positive(),
  supplierId: z.number().int().positive().optional(),
  qty: z.number().int().positive(),
  hargaSatuan: z.number().min(0),
  noPo: z.string().optional(),
  keterangan: z.string().optional(),
});

const stokKeluarSchema = z.object({
  sparepartId: z.number().int().positive(),
  qty: z.number().int().positive(),
  keterangan: z.string().min(1, 'Keterangan wajib diisi untuk stok keluar manual'),
});

const stokReturSchema = z.object({
  sparepartId: z.number().int().positive(),
  supplierId: z.number().int().positive(),
  qty: z.number().int().positive(),
  keterangan: z.string().optional(),
});

// GET /inventaris — recent logs
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { type, sparepartId, supplierId } = req.query;
    const where: any = {};
    if (type) where.type = type;
    if (sparepartId) where.sparepartId = Number(sparepartId);
    if (supplierId) where.supplierId = Number(supplierId);
    const [data, total] = await Promise.all([
      prisma.inventarisLog.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { sparepart: true, supplier: true },
      }),
      prisma.inventarisLog.count({ where }),
    ]);
    sendPaginated(res, data, total, page, limit);
  } catch (e) { next(e); }
});

// GET /inventaris/summary
router.get('/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalItem, nilaiStokRaw, menipis, habis] = await Promise.all([
      prisma.sparepart.count(),
      prisma.$queryRaw`SELECT COALESCE(SUM(hargaBeli * stok), 0) as total FROM sparepart` as any,
      prisma.$queryRaw`SELECT COUNT(*) as count FROM sparepart WHERE stok > 0 AND stok <= stokMinimum` as any,
      prisma.sparepart.count({ where: { stok: 0 } }),
    ]);
    sendSuccess(res, {
      totalItem,
      nilaiStok: Number(nilaiStokRaw[0]?.total || 0),
      menipis: menipis[0]?.count ? Number(menipis[0].count) : 0,
      habis,
    });
  } catch (e) { next(e); }
});

// POST /inventaris/masuk — Stok masuk
router.post('/masuk', requireRole('Admin'), validate(stokMasukSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sparepartId, supplierId, qty, hargaSatuan, noPo, keterangan } = req.body;
    const result = await prisma.$transaction(async (tx) => {
      const log = await tx.inventarisLog.create({
        data: {
          sparepartId, supplierId, type: 'masuk', qty, hargaSatuan,
          totalHarga: qty * hargaSatuan, noPo, keterangan,
        },
      });
      await tx.sparepart.update({
        where: { id: sparepartId },
        data: {
          stok: { increment: qty },
          hargaBeli: hargaSatuan, // Update harga beli terbaru
        },
      });
      return log;
    });
    sendCreated(res, result, `Stok masuk ${qty} pcs berhasil`);
  } catch (e) { next(e); }
});

// POST /inventaris/keluar — Stok keluar manual (di luar SPK)
router.post('/keluar', requireRole('Admin'), validate(stokKeluarSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sparepartId, qty, keterangan } = req.body;
    const result = await prisma.$transaction(async (tx) => {
      // Cek stok
      const sp = await tx.sparepart.findUnique({
        where: { id: sparepartId },
        select: { name: true, stok: true, hargaBeli: true },
      });
      if (!sp) throw new BadRequestError('Sparepart tidak ditemukan');
      if (sp.stok < qty) {
        throw new BadRequestError(
          `Stok "${sp.name}" tidak mencukupi (tersisa ${sp.stok}, butuh ${qty})`
        );
      }

      const log = await tx.inventarisLog.create({
        data: {
          sparepartId, type: 'keluar', qty,
          hargaSatuan: Number(sp.hargaBeli),
          totalHarga: qty * Number(sp.hargaBeli),
          keterangan,
        },
      });
      
      const updated = await tx.sparepart.updateMany({
        where: { id: sparepartId, stok: { gte: qty } },
        data: { stok: { decrement: qty } },
      });
      if (updated.count === 0) {
        throw new BadRequestError(`Stok tidak mencukupi untuk dikeluarkan saat permintaan diproses secara simultan.`);
      }
      return log;
    });
    sendCreated(res, result, `Stok keluar ${qty} pcs berhasil`);
  } catch (e) { next(e); }
});

// POST /inventaris/retur — Retur ke supplier
router.post('/retur', requireRole('Admin'), validate(stokReturSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sparepartId, supplierId, qty, keterangan } = req.body;
    const result = await prisma.$transaction(async (tx) => {
      // Cek stok
      const sp = await tx.sparepart.findUnique({
        where: { id: sparepartId },
        select: { name: true, stok: true, hargaBeli: true },
      });
      if (!sp) throw new BadRequestError('Sparepart tidak ditemukan');
      if (sp.stok < qty) {
        throw new BadRequestError(
          `Stok "${sp.name}" tidak mencukupi untuk diretur (tersisa ${sp.stok}, retur ${qty})`
        );
      }

      // Verifikasi supplier
      const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
      if (!supplier) throw new BadRequestError('Supplier tidak ditemukan');

      const log = await tx.inventarisLog.create({
        data: {
          sparepartId, supplierId, type: 'retur', qty,
          hargaSatuan: Number(sp.hargaBeli),
          totalHarga: qty * Number(sp.hargaBeli),
          keterangan: keterangan || `Retur ke ${supplier.name}`,
        },
      });
      
      const updated = await tx.sparepart.updateMany({
        where: { id: sparepartId, stok: { gte: qty } },
        data: { stok: { decrement: qty } },
      });
      if (updated.count === 0) {
        throw new BadRequestError(`Stok tidak mencukupi untuk diretur saat permintaan diproses secara simultan.`);
      }
      return log;
    });
    sendCreated(res, result, `Retur ${qty} pcs berhasil`);
  } catch (e) { next(e); }
});

// POST /inventaris/opname
router.post('/opname', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items, catatan } = req.body;
    const opname = await prisma.$transaction(async (tx) => {
      const created = await tx.stokOpname.create({
        data: {
          catatan,
          status: 'selesai',
          items: {
            create: items.map((item: any) => ({
              sparepartId: item.sparepartId,
              stokSistem: item.stokSistem,
              stokFisik: item.stokFisik,
              selisih: item.stokFisik - item.stokSistem,
              keterangan: item.keterangan,
            })),
          },
        },
        include: { items: true },
      });
      // Adjust stock based on physical count
      for (const item of items) {
        await tx.sparepart.update({
          where: { id: item.sparepartId },
          data: { stok: item.stokFisik },
        });
      }
      return created;
    });
    sendCreated(res, opname, 'Stok opname berhasil');
  } catch (e) { next(e); }
});

export default router;
