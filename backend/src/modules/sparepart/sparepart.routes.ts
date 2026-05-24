import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import db from '../../config/db';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendSuccess, sendCreated, sendPaginated, parsePagination } from '../../shared/utils';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import { appCache, CACHE_TTL } from '../../shared/cache';

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
    const conds: string[] = [];
    const params: any[] = [];
    if (search) { conds.push('(sp.name LIKE ? OR sp.kode LIKE ? OR sp.merk LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (kategoriId) { conds.push('sp.kategoriId = ?'); params.push(Number(kategoriId)); }
    if (lowStock === 'true') conds.push('sp.stok > 0');
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const [data, totalRow] = await Promise.all([
      db.query(
        `SELECT sp.*, ks.id AS katId, ks.name AS katName,
                su.id AS supId, su.name AS supName
         FROM sparepart sp
         LEFT JOIN kategori_sparepart ks ON ks.id = sp.kategoriId
         LEFT JOIN supplier su ON su.id = sp.supplierId
         ${where} ORDER BY sp.name ASC LIMIT ? OFFSET ?`,
        [...params, limit, skip]),
      db.queryOne<{ c: number }>(`SELECT COUNT(*) AS c FROM sparepart sp ${where}`, params),
    ]);
    const rows = data.map((r: any) => ({ ...r, kategori: r.katId ? { id: r.katId, name: r.katName } : null, supplier: r.supId ? { id: r.supId, name: r.supName } : null }));
    sendPaginated(res, rows, totalRow?.c ?? 0, page, limit);
  } catch (e) { next(e); }
});

router.get('/low-stock', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await db.query('SELECT * FROM sparepart WHERE stok <= stokMinimum ORDER BY stok ASC');
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

router.get('/categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await appCache.getOrSet('sparepart:categories', () =>
      db.query('SELECT * FROM kategori_sparepart ORDER BY name ASC'),
      CACHE_TTL.LONG // 5 minutes
    );
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

router.post('/categories', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newId = await db.insert('kategori_sparepart', { name: req.body.name });
    const data = await db.queryOne('SELECT * FROM kategori_sparepart WHERE id = ?', [newId]);
    await db.insert('activity_logs', {
      userId: (req as any).user?.id ?? null,
      action: 'create_kategori', module: 'master',
      targetId: newId, targetName: req.body.name,
    });
    appCache.invalidate('sparepart:categories');
    sendCreated(res, data);
  } catch (e) { next(e); }
});

router.put('/categories/:id', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const katId = Number(req.params.id);
    await db.update('kategori_sparepart', { name: req.body.name }, 'id = ?', [katId]);
    const data = await db.queryOne('SELECT * FROM kategori_sparepart WHERE id = ?', [katId]);
    await db.insert('activity_logs', {
      userId: (req as any).user?.id ?? null,
      action: 'update_kategori', module: 'master',
      targetId: katId, targetName: data?.name,
    });
    appCache.invalidate('sparepart:categories');
    sendSuccess(res, data, 'Kategori berhasil diperbarui');
  } catch (e) { next(e); }
});

router.delete('/categories/:id', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const kategori = await db.queryOne<{ name: string }>('SELECT name FROM kategori_sparepart WHERE id = ?', [id]);
    const inUse = await db.queryVal<number>('SELECT COUNT(*) FROM sparepart WHERE kategoriId = ?', [id]);
    if (inUse > 0) {
      throw new BadRequestError(`Kategori ini masih digunakan oleh ${inUse} sparepart dan tidak dapat dihapus.`);
    }
    await db.execute('DELETE FROM kategori_sparepart WHERE id = ?', [id]);
    await db.insert('activity_logs', {
      userId: (req as any).user?.id ?? null,
      action: 'delete_kategori', module: 'master',
      targetId: id, targetName: kategori?.name,
    });
    appCache.invalidate('sparepart:categories');
    sendSuccess(res, null, 'Kategori berhasil dihapus');
  } catch (e) { next(e); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const spId = Number(req.params.id);
    const data = await db.queryOne('SELECT * FROM sparepart WHERE id = ?', [spId]);
    if (!data) throw new NotFoundError('Sparepart');
    const [kategori, supplier, logs] = await Promise.all([
      data.kategoriId ? db.queryOne('SELECT * FROM kategori_sparepart WHERE id = ?', [data.kategoriId]) : null,
      data.supplierId ? db.queryOne('SELECT * FROM supplier WHERE id = ?', [data.supplierId]) : null,
      db.query('SELECT * FROM inventaris_log WHERE sparepartId = ? ORDER BY createdAt DESC LIMIT 20', [spId]),
    ]);
    (data as any).kategori = kategori;
    (data as any).supplier = supplier;
    (data as any).inventarisLog = logs;
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

router.post('/', requireRole('Admin'), validate(createSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newId = await db.insert('sparepart', req.body);
    const data = await db.queryOne('SELECT * FROM sparepart WHERE id = ?', [newId]);
    await db.insert('activity_logs', {
      userId: (req as any).user?.id ?? null,
      action: 'create', module: 'master',
      targetId: newId, targetName: req.body.name,
    });
    sendCreated(res, data, 'Sparepart berhasil ditambahkan');
  } catch (e) { next(e); }
});

router.put('/:id', requireRole('Admin'), validate(updateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const spId = Number(req.params.id);
    await db.update('sparepart', { ...req.body, updatedAt: new Date() }, 'id = ?', [spId]);
    const data = await db.queryOne('SELECT * FROM sparepart WHERE id = ?', [spId]);
    await db.insert('activity_logs', {
      userId: (req as any).user?.id ?? null,
      action: 'update', module: 'master',
      targetId: spId, targetName: data?.name,
    });
    sendSuccess(res, data, 'Sparepart berhasil diperbarui');
  } catch (e) { next(e); }
});

router.delete('/:id', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);

    // Cek apakah sparepart masih dipakai di SPK
    const usedInSpk = await db.queryVal<number>('SELECT COUNT(*) FROM spk_items WHERE sparepartId = ?', [id]);
    if (usedInSpk > 0) {
      throw new BadRequestError(
        `Sparepart ini masih digunakan di ${usedInSpk} item SPK dan tidak dapat dihapus.`
      );
    }

    const usedInJasa = await db.queryVal<number>('SELECT COUNT(*) FROM jasa_sparepart WHERE sparepartId = ?', [id]);
    if (usedInJasa > 0) {
      throw new BadRequestError(
        `Sparepart ini masih terhubung dengan ${usedInJasa} paket jasa dan tidak dapat dihapus.`
      );
    }

    const usedInOpname = await db.queryVal<number>('SELECT COUNT(*) FROM stok_opname_items WHERE sparepartId = ?', [id]);
    if (usedInOpname > 0) {
      throw new BadRequestError(
        `Sparepart ini memiliki ${usedInOpname} riwayat opname dan tidak dapat dihapus untuk menjaga integritas data.`
      );
    }

    const sp = await db.queryOne<{ name: string }>('SELECT name FROM sparepart WHERE id = ?', [id]);
    await db.transaction(async (tx) => {
      await tx.execute('DELETE FROM inventaris_log WHERE sparepartId = ?', [id]);
      await tx.execute('DELETE FROM sparepart WHERE id = ?', [id]);
      await tx.insert('activity_logs', {
        userId: (req as any).user?.id ?? null,
        action: 'delete', module: 'master',
        targetId: id, targetName: sp?.name,
      });
    });

    sendSuccess(res, null, 'Sparepart berhasil dihapus');
  } catch (e) { next(e); }
});

export default router;
