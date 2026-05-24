import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import db from '../../config/db';
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
  tanggal: z.string().datetime().optional(),
  noPo: z.string().optional(),
  keterangan: z.string().optional(),
});

const stokMasukBatchSchema = z.object({
  supplierId: z.number().int().positive().optional(),
  noPo: z.string().optional(),
  tanggal: z.string().datetime().optional(),
  ongkosKirim: z.number().min(0).default(0),
  keterangan: z.string().optional(),
  items: z.array(z.object({
    sparepartId: z.number().int().positive(),
    qty: z.number().int().positive(),
    hargaSatuan: z.number().min(0),
  })).min(1, 'Minimal 1 item diperlukan'),
});

// Compute new weighted average cost
function computeWAC(stokLama: number, hargaLama: number, qtyMasuk: number, hargaMasuk: number): number {
  const total = stokLama + qtyMasuk;
  if (total <= 0) return hargaMasuk;
  return ((stokLama * hargaLama) + (qtyMasuk * hargaMasuk)) / total;
}

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
    const [opnames, totalRow] = await Promise.all([
      db.query('SELECT * FROM stok_opname ORDER BY tanggal DESC LIMIT ? OFFSET ?', [limit, skip]),
      db.queryOne<{ c: number }>('SELECT COUNT(*) AS c FROM stok_opname'),
    ]);
    const opIds = opnames.map((o: any) => o.id);
    const opItems = opIds.length ? await db.query('SELECT * FROM stok_opname_items WHERE stokOpnameId IN (?)', [opIds]) : [];
    const itemMap = new Map<number, any[]>();
    for (const it of opItems) { if (!itemMap.has(it.stokOpnameId)) itemMap.set(it.stokOpnameId, []); itemMap.get(it.stokOpnameId)!.push(it); }
    const data = opnames.map((o: any) => ({ ...o, items: itemMap.get(o.id) || [] }));
    sendPaginated(res, data, totalRow?.c ?? 0, page, limit);
  } catch (e) { next(e); }
});

// GET /inventaris — recent logs
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { type, sparepartId, supplierId, startDate, endDate, q } = req.query;
    const conds: string[] = [];
    const params: any[] = [];
    if (type) { conds.push('il.type = ?'); params.push(type); }
    if (sparepartId) { conds.push('il.sparepartId = ?'); params.push(Number(sparepartId)); }
    if (supplierId) { conds.push('il.supplierId = ?'); params.push(Number(supplierId)); }
    if (startDate) { conds.push('il.createdAt >= ?'); params.push(new Date(String(startDate))); }
    if (endDate) { const end = new Date(String(endDate)); end.setHours(23,59,59,999); conds.push('il.createdAt <= ?'); params.push(end); }
    if (q) {
      conds.push('(il.noPo LIKE ? OR il.keterangan LIKE ? OR sp.name LIKE ?)');
      const like = `%${q}%`; params.push(like, like, like);
    }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const [rows, totalRow] = await Promise.all([
      db.query(
        `SELECT il.*, sp.name AS spName, sp.kode AS spKode, su.name AS suName
         FROM inventaris_log il
         LEFT JOIN sparepart sp ON sp.id = il.sparepartId
         LEFT JOIN supplier su ON su.id = il.supplierId
         ${where} ORDER BY il.createdAt DESC LIMIT ? OFFSET ?`,
        [...params, limit, skip]),
      db.queryOne<{ c: number }>(`SELECT COUNT(*) AS c FROM inventaris_log il LEFT JOIN sparepart sp ON sp.id = il.sparepartId ${where}`, params),
    ]);
    const data = rows.map((r: any) => ({
      ...r,
      sparepart: r.sparepartId ? { id: r.sparepartId, name: r.spName, kode: r.spKode } : null,
      supplier: r.supplierId ? { id: r.supplierId, name: r.suName } : null,
    }));
    sendPaginated(res, data, totalRow?.c ?? 0, page, limit);
  } catch (e) { next(e); }
});

// GET /inventaris/summary
router.get('/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [totalItem, nilaiStokRow, menipisRow, habis] = await Promise.all([
      db.queryVal<number>('SELECT COUNT(*) FROM sparepart'),
      db.queryOne<{ total: number }>('SELECT COALESCE(SUM(hargaBeli * stok), 0) AS total FROM sparepart'),
      db.queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM sparepart WHERE stok > 0 AND stok <= stokMinimum'),
      db.queryVal<number>('SELECT COUNT(*) FROM sparepart WHERE stok = 0'),
    ]);
    sendSuccess(res, {
      totalItem,
      nilaiStok: Number(nilaiStokRow?.total || 0),
      menipis: Number(menipisRow?.count || 0),
      habis,
    });
  } catch (e) { next(e); }
});

// POST /inventaris/masuk — Stok masuk (single; WAC applied)
router.post('/masuk', requireRole('Admin'), validate(stokMasukSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sparepartId, supplierId, qty, hargaSatuan, noPo, keterangan, tanggal } = req.body;
    const createdAt = tanggal ? new Date(tanggal) : new Date();
    const result = await db.transaction(async (tx) => {
      const sp = await tx.queryOne<any>('SELECT stok, hargaBeli, name FROM sparepart WHERE id = ? FOR UPDATE', [sparepartId]);
      if (!sp) throw new BadRequestError('Sparepart tidak ditemukan');
      const newHargaBeli = computeWAC(sp.stok, Number(sp.hargaBeli), qty, hargaSatuan);

      const logId = await tx.insert('inventaris_log', {
        sparepartId, supplierId, type: 'masuk', qty, hargaSatuan,
        totalHarga: qty * hargaSatuan, noPo, keterangan, createdAt,
      });
      await tx.execute('UPDATE sparepart SET stok = stok + ?, hargaBeli = ? WHERE id = ?', [qty, newHargaBeli, sparepartId]);
      await tx.insert('activity_logs', {
        userId: (req as any).user?.id ?? null,
        action: 'stok_masuk', module: 'inventaris',
        targetId: sparepartId, detail: JSON.stringify({ qty, hargaSatuan, noPo, wac: newHargaBeli }),
      });
      return await tx.queryOne('SELECT * FROM inventaris_log WHERE id = ?', [logId]);
    });
    sendCreated(res, result, `Stok masuk ${qty} pcs berhasil`);
  } catch (e) { next(e); }
});

// POST /inventaris/masuk/batch — Stok masuk banyak item (1 PO, 1 transaction, WAC, alokasi ongkir)
router.post('/masuk/batch', requireRole('Admin'), validate(stokMasukBatchSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { supplierId, noPo, tanggal, ongkosKirim, keterangan, items } = req.body as z.infer<typeof stokMasukBatchSchema>;
    const createdAt = tanggal ? new Date(tanggal) : new Date();

    // Guard duplikasi sparepart dalam items
    const seen = new Set<number>();
    for (const it of items) {
      if (seen.has(it.sparepartId)) {
        throw new BadRequestError(`Sparepart id ${it.sparepartId} muncul lebih dari 1x. Gabungkan ke 1 baris.`);
      }
      seen.add(it.sparepartId);
    }

    // Alokasi ongkir proporsional (berdasarkan subtotal qty*harga)
    const subtotals = items.map(i => i.qty * i.hargaSatuan);
    const grandSub = subtotals.reduce((a, b) => a + b, 0);
    const alokasi: number[] = items.map((it, idx) =>
      grandSub > 0 ? (subtotals[idx] / grandSub) * (ongkosKirim || 0) : 0
    );

    const result = await db.transaction(async (tx) => {
      const sparepartIds = items.map((i: any) => i.sparepartId);
      const existing = await tx.query('SELECT id, stok, hargaBeli, name FROM sparepart WHERE id IN (?)', [sparepartIds]);
      const spMap = new Map(existing.map((s: any) => [s.id, s]));
      for (const it of items) {
        if (!spMap.has(it.sparepartId)) {
          throw new BadRequestError(`Sparepart id ${it.sparepartId} tidak ditemukan`);
        }
      }

      const logs = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const sp = spMap.get(it.sparepartId)!;
        const hargaEff = it.hargaSatuan + (it.qty > 0 ? alokasi[i] / it.qty : 0);
        const newHargaBeli = computeWAC(sp.stok, Number(sp.hargaBeli), it.qty, hargaEff);
        const logId = await tx.insert('inventaris_log', {
          sparepartId: it.sparepartId, supplierId, type: 'masuk',
          qty: it.qty, hargaSatuan: it.hargaSatuan,
          totalHarga: it.qty * it.hargaSatuan + alokasi[i],
          noPo, keterangan, createdAt,
        });
        await tx.execute('UPDATE sparepart SET stok = stok + ?, hargaBeli = ? WHERE id = ?', [it.qty, newHargaBeli, it.sparepartId]);
        logs.push(await tx.queryOne('SELECT * FROM inventaris_log WHERE id = ?', [logId]));
        // Update in-memory map for subsequent WAC calculations
        sp.stok += it.qty;
        sp.hargaBeli = newHargaBeli;
      }

      await tx.insert('activity_logs', {
        userId: (req as any).user?.id ?? null,
        action: 'stok_masuk_batch', module: 'inventaris',
        detail: JSON.stringify({ noPo, supplierId, itemCount: items.length, grandSub, ongkosKirim }),
      });
      return logs;
    });

    sendCreated(res, { logs: result, itemCount: result.length }, `${result.length} item stok masuk berhasil dicatat`);
  } catch (e) { next(e); }
});

// POST /inventaris/keluar — Stok keluar manual (di luar SPK)
router.post('/keluar', requireRole('Admin'), validate(stokKeluarSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sparepartId, qty, keterangan } = req.body;
    const result = await db.transaction(async (tx) => {
      const sp = await tx.queryOne<any>('SELECT name, stok, hargaBeli FROM sparepart WHERE id = ? FOR UPDATE', [sparepartId]);
      if (!sp) throw new BadRequestError('Sparepart tidak ditemukan');
      if (sp.stok < qty) {
        throw new BadRequestError(
          `Stok "${sp.name}" tidak mencukupi (tersisa ${sp.stok}, butuh ${qty})`
        );
      }

      const logId = await tx.insert('inventaris_log', {
        sparepartId, type: 'keluar', qty,
        hargaSatuan: Number(sp.hargaBeli),
        totalHarga: qty * Number(sp.hargaBeli),
        keterangan,
      });

      const r = await tx.execute('UPDATE sparepart SET stok = stok - ? WHERE id = ? AND stok >= ?', [qty, sparepartId, qty]);
      if (r.affectedRows === 0) {
        throw new BadRequestError(`Stok tidak mencukupi untuk dikeluarkan saat permintaan diproses secara simultan.`);
      }
      await tx.insert('activity_logs', {
        userId: (req as any).user?.id ?? null,
        action: 'stok_keluar', module: 'inventaris',
        targetId: sparepartId, detail: JSON.stringify({ qty, keterangan }),
      });
      return await tx.queryOne('SELECT * FROM inventaris_log WHERE id = ?', [logId]);
    });
    sendCreated(res, result, `Stok keluar ${qty} pcs berhasil`);
  } catch (e) { next(e); }
});

// POST /inventaris/retur — Retur ke supplier
router.post('/retur', requireRole('Admin'), validate(stokReturSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sparepartId, supplierId, qty, keterangan } = req.body;
    const result = await db.transaction(async (tx) => {
      const sp = await tx.queryOne<any>('SELECT name, stok, hargaBeli FROM sparepart WHERE id = ? FOR UPDATE', [sparepartId]);
      if (!sp) throw new BadRequestError('Sparepart tidak ditemukan');
      if (sp.stok < qty) {
        throw new BadRequestError(
          `Stok "${sp.name}" tidak mencukupi untuk diretur (tersisa ${sp.stok}, retur ${qty})`
        );
      }

      const supplier = await tx.queryOne<any>('SELECT * FROM supplier WHERE id = ?', [supplierId]);
      if (!supplier) throw new BadRequestError('Supplier tidak ditemukan');

      const logId = await tx.insert('inventaris_log', {
        sparepartId, supplierId, type: 'retur', qty,
        hargaSatuan: Number(sp.hargaBeli),
        totalHarga: qty * Number(sp.hargaBeli),
        keterangan: keterangan || `Retur ke ${supplier.name}`,
      });

      const r = await tx.execute('UPDATE sparepart SET stok = stok - ? WHERE id = ? AND stok >= ?', [qty, sparepartId, qty]);
      if (r.affectedRows === 0) {
        throw new BadRequestError(`Stok tidak mencukupi untuk diretur saat permintaan diproses secara simultan.`);
      }
      await tx.insert('activity_logs', {
        userId: (req as any).user?.id ?? null,
        action: 'stok_retur', module: 'inventaris',
        targetId: sparepartId, detail: JSON.stringify({ qty, supplierId }),
      });
      return await tx.queryOne('SELECT * FROM inventaris_log WHERE id = ?', [logId]);
    });
    sendCreated(res, result, `Retur ${qty} pcs berhasil`);
  } catch (e) { next(e); }
});

// POST /inventaris/opname
router.post('/opname', requireRole('Admin'), validate(opnameSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items, catatan } = req.body;
    const operatorName = (req as any).user?.name || 'Admin';

    const opname = await db.transaction(async (tx) => {
      const sparepartIds = items.map((i: any) => i.sparepartId);
      const spareparts = await tx.query('SELECT id, stok, name FROM sparepart WHERE id IN (?)', [sparepartIds]);
      const stokMap = new Map(spareparts.map((sp: any) => [sp.id, sp]));

      for (const item of items) {
        if (!stokMap.has(item.sparepartId)) {
          throw new BadRequestError(`Sparepart ID ${item.sparepartId} tidak ditemukan`);
        }
      }

      const opnameId = await tx.insert('stok_opname', { catatan, status: 'selesai' });

      const opnameItems: any[] = [];
      for (const item of items) {
        const sp = stokMap.get(item.sparepartId)!;
        const stokSistem = Number(sp.stok);
        const stokFisik = Number(item.stokFisik);
        const selisih = stokFisik - stokSistem;
        const itemId = await tx.insert('stok_opname_items', {
          stokOpnameId: opnameId,
          sparepartId: item.sparepartId,
          stokSistem, stokFisik, selisih,
          keterangan: item.keterangan,
        });
        opnameItems.push({ id: itemId, sparepartId: item.sparepartId, stokSistem, stokFisik, selisih, keterangan: item.keterangan });

        if (selisih !== 0) {
          await tx.execute('UPDATE sparepart SET stok = ? WHERE id = ?', [stokFisik, item.sparepartId]);
          const ket = `[Opname] ${selisih > 0 ? '+' : ''}${selisih}: ${stokSistem}→${stokFisik}${item.keterangan ? ` - ${item.keterangan}` : ''}`.slice(0, 195);
          await tx.insert('inventaris_log', {
            sparepartId: item.sparepartId,
            type: 'opname',
            qty: Math.abs(selisih),
            keterangan: ket,
          });
        }
      }
      await tx.insert('activity_logs', {
        userId: (req as any).user?.id ?? null,
        action: 'opname', module: 'inventaris',
        detail: JSON.stringify({ itemCount: items.length, catatan }),
      });
      const created = await tx.queryOne('SELECT * FROM stok_opname WHERE id = ?', [opnameId]);
      return { ...created, items: opnameItems };
    });
    sendCreated(res, opname, 'Stok opname berhasil');
  } catch (e) { next(e); }
});

export default router;
