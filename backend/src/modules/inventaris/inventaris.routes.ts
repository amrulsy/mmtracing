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

const opnameItemSchema = z.object({
  sparepartId: z.number().int().positive(),
  stokFisik: z.number().int().min(0),
  keterangan: z.string().optional(),
});

const opnameSchema = z.object({
  items: z.array(opnameItemSchema).min(1, 'Minimal 1 item diperlukan untuk opname'),
  catatan: z.string().optional(),
});

// GET /inventaris/opname — history stok opname
router.get('/opname', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const [data, total] = await Promise.all([
      prisma.stokOpname.findMany({
        skip, take: limit,
        orderBy: { tanggal: 'desc' },
        include: { items: true },
      }),
      prisma.stokOpname.count(),
    ]);
    sendPaginated(res, data, total, page, limit);
  } catch (e) { next(e); }
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
      await tx.activityLog.create({ data: {
        userId: (req as any).user?.id ?? null,
        action: 'stok_masuk', module: 'inventaris',
        targetId: sparepartId, detail: JSON.stringify({ qty, hargaSatuan, noPo }),
      }});
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
      await tx.activityLog.create({ data: {
        userId: (req as any).user?.id ?? null,
        action: 'stok_keluar', module: 'inventaris',
        targetId: sparepartId, detail: JSON.stringify({ qty, keterangan }),
      }});
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
      await tx.activityLog.create({ data: {
        userId: (req as any).user?.id ?? null,
        action: 'stok_retur', module: 'inventaris',
        targetId: sparepartId, detail: JSON.stringify({ qty, supplierId }),
      }});
      return log;
    });
    sendCreated(res, result, `Retur ${qty} pcs berhasil`);
  } catch (e) { next(e); }
});

// POST /inventaris/opname
router.post('/opname', requireRole('Admin'), validate(opnameSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items, catatan } = req.body;
    const operatorName = (req as any).user?.name || 'Admin';

    const opname = await prisma.$transaction(async (tx) => {
      // Fetch stok sistem dari DB untuk setiap sparepartId (bukan percaya client)
      const sparepartIds = items.map((i: any) => i.sparepartId);
      const spareparts = await tx.sparepart.findMany({
        where: { id: { in: sparepartIds } },
        select: { id: true, stok: true, name: true },
      });
      const stokMap = new Map(spareparts.map((sp: any) => [sp.id, sp]));

      // Validasi semua sparepartId valid
      for (const item of items) {
        if (!stokMap.has(item.sparepartId)) {
          throw new BadRequestError(`Sparepart ID ${item.sparepartId} tidak ditemukan`);
        }
      }

      const created = await tx.stokOpname.create({
        data: {
          catatan,
          status: 'selesai',
          items: {
            create: items.map((item: any) => {
              const sp = stokMap.get(item.sparepartId)!;
              const stokSistem = Number(sp.stok);
              const stokFisik = Number(item.stokFisik);
              return {
                sparepartId: item.sparepartId,
                stokSistem,
                stokFisik,
                selisih: stokFisik - stokSistem,
                keterangan: item.keterangan,
              };
            }),
          },
        },
        include: { items: true },
      });

      // Adjust stock based on physical count
      for (const item of items) {
        const sp = stokMap.get(item.sparepartId)!;
        const stokSistem = Number(sp.stok);
        const stokFisik = Number(item.stokFisik);
        const selisih = stokFisik - stokSistem;
        if (selisih !== 0) {
          await tx.sparepart.update({
            where: { id: item.sparepartId },
            data: { stok: stokFisik },
          });

          const ket = `[Opname] ${selisih > 0 ? '+' : ''}${selisih}: ${stokSistem}→${stokFisik}${item.keterangan ? ` - ${item.keterangan}` : ''}`.slice(0, 195);
          await tx.inventarisLog.create({
            data: {
              sparepartId: item.sparepartId,
              type: 'opname',
              qty: Math.abs(selisih),
              keterangan: ket,
            },
          });
        }
      }
      await tx.activityLog.create({ data: {
        userId: (req as any).user?.id ?? null,
        action: 'opname', module: 'inventaris',
        detail: JSON.stringify({ itemCount: items.length, catatan }),
      }});
      return created;
    });
    sendCreated(res, opname, 'Stok opname berhasil');
  } catch (e) { next(e); }
});

export default router;
