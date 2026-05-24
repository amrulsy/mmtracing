import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import db from '../../config/db';
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
  hargaModal: z.number().min(0).default(0),
  estimasiWaktu: z.string().optional(),
  garansiHari: z.number().int().default(30),
  sparepartBundles: z.array(sparepartBundleSchema).optional(),
});

const updateSchema = z.object({
  kode: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  kategori: z.string().optional(),
  harga: z.number().min(0).optional(),
  hargaModal: z.number().min(0).optional(),
  estimasiWaktu: z.string().optional(),
  garansiHari: z.number().int().optional(),
  sparepartBundles: z.array(sparepartBundleSchema).optional(),
});

// GET /jasa — list all with pagination
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { search, kategori } = req.query;
    const conds: string[] = [];
    const params: any[] = [];
    if (search) { conds.push('(j.name LIKE ? OR j.kode LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    if (kategori) { conds.push('j.kategori = ?'); params.push(kategori); }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const [rows, totalRow] = await Promise.all([
      db.query(`SELECT j.* FROM jasa j ${where} ORDER BY j.name ASC LIMIT ? OFFSET ?`, [...params, limit, skip]),
      db.queryOne<{ c: number }>(`SELECT COUNT(*) AS c FROM jasa j ${where}`, params),
    ]);
    // Attach sparepartBundles
    if (rows.length) {
      const ids = rows.map((r: any) => r.id);
      const bundles = await db.query(
        `SELECT js.*, sp.id AS spId, sp.kode AS spKode, sp.name AS spName, sp.hargaJual AS spHargaJual, sp.stok AS spStok
         FROM jasa_sparepart js
         LEFT JOIN sparepart sp ON sp.id = js.sparepartId
         WHERE js.jasaId IN (?)`, [ids]);
      const bmap = new Map<number, any[]>();
      for (const b of bundles) { if (!bmap.has(b.jasaId)) bmap.set(b.jasaId, []); bmap.get(b.jasaId)!.push({ ...b, sparepart: { id: b.spId, kode: b.spKode, name: b.spName, hargaJual: b.spHargaJual, stok: b.spStok } }); }
      for (const r of rows) (r as any).sparepartBundles = bmap.get(r.id) || [];
    }
    sendPaginated(res, rows, totalRow?.c ?? 0, page, limit);
  } catch (e) { next(e); }
});

// GET /jasa/:id — detail by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const data = await db.queryOne('SELECT * FROM jasa WHERE id = ?', [id]);
    if (!data) throw new NotFoundError('Jasa');
    const [bundles, spkItems] = await Promise.all([
      db.query(
        `SELECT js.*, sp.* FROM jasa_sparepart js
         LEFT JOIN sparepart sp ON sp.id = js.sparepartId
         WHERE js.jasaId = ?`, [id]),
      db.query(
        `SELECT si.*, s.id AS spkId, s.noSpk, s.status AS spkStatus, s.tanggal AS spkTanggal
         FROM spk_items si
         LEFT JOIN spk s ON s.id = si.spkId
         WHERE si.jasaId = ?
         ORDER BY si.createdAt DESC LIMIT 20`, [id]),
    ]);
    (data as any).sparepartBundles = bundles.map((b: any) => ({ ...b, sparepart: b }));
    (data as any).spkItems = spkItems.map((si: any) => ({ ...si, spk: { id: si.spkId, noSpk: si.noSpk, status: si.spkStatus, tanggal: si.spkTanggal } }));
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

// POST /jasa — create with optional sparepartBundles
router.post('/', requireRole('Admin'), validate(createSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sparepartBundles, kode, ...jasaData } = req.body;
    const finalKode = kode || `JS-${Date.now().toString(36).toUpperCase().slice(-5)}`;
    const jasaId = await db.insert('jasa', { ...jasaData, kode: finalKode });
    if (sparepartBundles?.length) {
      for (const b of sparepartBundles) {
        await db.insert('jasa_sparepart', { jasaId, sparepartId: b.sparepartId, qtyDefault: b.qtyDefault ?? 1 });
      }
    }
    const data = await db.queryOne('SELECT * FROM jasa WHERE id = ?', [jasaId]);
    await db.insert('activity_logs', {
      userId: (req as any).user?.id ?? null,
      action: 'create', module: 'master',
      targetId: jasaId, targetName: jasaData.name,
    });
    sendCreated(res, data, 'Jasa berhasil ditambahkan');
  } catch (e) { next(e); }
});

// PUT /jasa/:id — update with optional sparepartBundles sync
router.put('/:id', requireRole('Admin'), validate(updateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const { sparepartBundles, ...jasaData } = req.body;

    await db.transaction(async (tx) => {
      if (Object.keys(jasaData).length > 0) {
        await tx.update('jasa', { ...jasaData, updatedAt: new Date() }, 'id = ?', [id]);
      }
      if (sparepartBundles !== undefined) {
        await tx.execute('DELETE FROM jasa_sparepart WHERE jasaId = ?', [id]);
        for (const b of sparepartBundles) {
          await tx.insert('jasa_sparepart', { jasaId: id, sparepartId: b.sparepartId, qtyDefault: b.qtyDefault ?? 1 });
        }
      }
    });

    const data = await db.queryOne('SELECT * FROM jasa WHERE id = ?', [id]);
    await db.insert('activity_logs', {
      userId: (req as any).user?.id ?? null,
      action: 'update', module: 'master',
      targetId: id, targetName: data?.name,
    });

    sendSuccess(res, data, 'Jasa berhasil diperbarui');
  } catch (e) { next(e); }
});

// DELETE /jasa/:id — with protection
router.delete('/:id', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);

    // Cek apakah jasa masih dipakai di SPK
    const usedInSpk = await db.queryVal<number>('SELECT COUNT(*) FROM spk_items WHERE jasaId = ?', [id]);
    if (usedInSpk > 0) {
      throw new BadRequestError(
        `Jasa ini masih digunakan di ${usedInSpk} item SPK dan tidak dapat dihapus. Anda bisa menonaktifkan atau mengganti nama jasa ini.`
      );
    }

    const jasa = await db.queryOne<{ name: string }>('SELECT name FROM jasa WHERE id = ?', [id]);
    await db.transaction(async (tx) => {
      await tx.execute('DELETE FROM jasa_sparepart WHERE jasaId = ?', [id]);
      await tx.execute('DELETE FROM jasa WHERE id = ?', [id]);
      await tx.insert('activity_logs', {
        userId: (req as any).user?.id ?? null,
        action: 'delete', module: 'master',
        targetId: id, targetName: jasa?.name,
      });
    });

    sendSuccess(res, null, 'Jasa berhasil dihapus');
  } catch (e) { next(e); }
});

export default router;
