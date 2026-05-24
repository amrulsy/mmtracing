import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import db from '../../config/db';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendSuccess, sendCreated, sendPaginated, parsePagination } from '../../shared/utils';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import { normalizePhone, normalizePlat, isValidPlat } from '../../shared/validators';

const router = Router();
router.use(authMiddleware);

// Schemas
const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  photoUrl: z.string().url().optional().or(z.literal('')),
  type: z.enum(['kendaraan', 'bubut', 'both']).default('kendaraan'),
  loyaltyTierId: z.number().int().optional(),
});

const kendaraanItemSchema = z.object({
  name: z.string().min(1),
  plat: z.string().min(1).refine(isValidPlat, { message: 'Format plat tidak valid (contoh: B 1234 ABC)' }),
  tahun: z.string().optional(),
  warna: z.string().optional(),
  noRangka: z.string().optional(),
  noMesin: z.string().optional(),
  odometer: z.number().int().optional(),
});

const createWithKendaraanSchema = createSchema.extend({
  kendaraan: z.array(kendaraanItemSchema).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  photoUrl: z.string().url().optional().or(z.literal('')),
  type: z.enum(['kendaraan', 'bubut', 'both']).optional(),
  loyaltyTierId: z.number().int().optional(),
});

const mergeSchema = z.object({
  targetId: z.number().int().positive(),
});

// GET /pelanggan
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { search, type, includeDeleted } = req.query;
    const conds: string[] = [];
    const params: any[] = [];
    if (!includeDeleted) conds.push('p.deletedAt IS NULL');
    if (type && type !== 'semua') { conds.push('p.type = ?'); params.push(type); }
    if (search) { conds.push('(p.name LIKE ? OR p.phone LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const [rows, totalRow] = await Promise.all([
      db.query(
        `SELECT p.*, lt.name AS loyaltyTierName, lt.minPoints AS loyaltyTierMinPoints,
                (SELECT COUNT(*) FROM spk WHERE pelangganId = p.id) AS _countSpk
         FROM pelanggan p
         LEFT JOIN loyalty_tiers lt ON lt.id = p.loyaltyTierId
         ${where} ORDER BY p.updatedAt DESC LIMIT ? OFFSET ?`,
        [...params, limit, skip]),
      db.queryOne<{ c: number }>(`SELECT COUNT(*) AS c FROM pelanggan p ${where}`, params),
    ]);
    // Attach kendaraan
    if (rows.length) {
      const ids = rows.map((r: any) => r.id);
      const kendaraans = await db.query('SELECT * FROM kendaraan WHERE pelangganId IN (?) AND deletedAt IS NULL', [ids]);
      const kmap = new Map<number, any[]>();
      for (const k of kendaraans) { if (!kmap.has(k.pelangganId)) kmap.set(k.pelangganId, []); kmap.get(k.pelangganId)!.push(k); }
      for (const r of rows) {
        (r as any).kendaraan = kmap.get(r.id) || [];
        (r as any).loyaltyTier = r.loyaltyTierId ? { id: r.loyaltyTierId, name: r.loyaltyTierName, minPoints: r.loyaltyTierMinPoints } : null;
      }
    }
    sendPaginated(res, rows, totalRow?.c ?? 0, page, limit);
  } catch (e) { next(e); }
});

// GET /pelanggan/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const data = await db.queryOne('SELECT * FROM pelanggan WHERE id = ? AND deletedAt IS NULL', [id]);
    if (!data) throw new NotFoundError('Pelanggan');
    const [kendaraans, spks, loyaltyPts, loyaltyTier] = await Promise.all([
      db.query('SELECT * FROM kendaraan WHERE pelangganId = ? AND deletedAt IS NULL', [id]),
      db.query(
        `SELECT s.*, m.name AS mekanikName FROM spk s LEFT JOIN mekanik m ON m.id = s.mekanikId
         WHERE s.pelangganId = ? ORDER BY s.createdAt DESC LIMIT 10`, [id]),
      db.query('SELECT * FROM loyalty_points WHERE pelangganId = ? ORDER BY createdAt DESC LIMIT 20', [id]),
      data.loyaltyTierId ? db.queryOne('SELECT * FROM loyalty_tiers WHERE id = ?', [data.loyaltyTierId]) : null,
    ]);
    (data as any).kendaraan = kendaraans;
    (data as any).loyaltyTier = loyaltyTier;
    (data as any).spk = spks.map((s: any) => ({ ...s, mekanik: s.mekanikName ? { name: s.mekanikName } : null }));
    (data as any).loyaltyPoints = loyaltyPts;
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

// POST /pelanggan
router.post('/', validate(createSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = { ...req.body, phone: normalizePhone(req.body.phone) };
    const newId = await db.insert('pelanggan', body);
    const data = await db.queryOne('SELECT * FROM pelanggan WHERE id = ?', [newId]);
    await db.insert('activity_logs', {
      userId: (req as any).user?.id ?? null,
      action: 'create', module: 'pelanggan',
      targetId: newId, targetName: body.name,
    });
    sendCreated(res, data, 'Pelanggan berhasil ditambahkan');
  } catch (e) { next(e); }
});

// POST /pelanggan/with-kendaraan — registrasi pelanggan + kendaraan dalam 1 transaksi
router.post('/with-kendaraan', validate(createWithKendaraanSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { kendaraan, ...pelangganBody } = req.body;
    pelangganBody.phone = normalizePhone(pelangganBody.phone);

    const result = await db.transaction(async (tx) => {
      const pelangganId = await tx.insert('pelanggan', pelangganBody);
      const pelanggan = await tx.queryOne('SELECT * FROM pelanggan WHERE id = ?', [pelangganId]);
      const kendaraanCreated = [] as any[];
      if (Array.isArray(kendaraan) && kendaraan.length) {
        for (const k of kendaraan) {
          const kId = await tx.insert('kendaraan', { ...k, plat: normalizePlat(k.plat), pelangganId });
          const created = await tx.queryOne('SELECT * FROM kendaraan WHERE id = ?', [kId]);
          kendaraanCreated.push(created);
        }
      }
      await tx.insert('activity_logs', {
        userId: (req as any).user?.id ?? null,
        action: 'create', module: 'pelanggan',
        targetId: pelangganId,
        targetName: `${pelangganBody.name} (+${kendaraanCreated.length} kendaraan)`,
      });
      return { ...pelanggan, kendaraan: kendaraanCreated };
    });
    sendCreated(res, result, 'Pelanggan & kendaraan berhasil ditambahkan');
  } catch (e) { next(e); }
});

// PUT /pelanggan/:id
router.put('/:id', requireRole('Admin'), validate(updateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = { ...req.body };
    if (body.phone) body.phone = normalizePhone(body.phone);
    const id = Number(req.params.id);
    await db.update('pelanggan', { ...body, updatedAt: new Date() }, 'id = ?', [id]);
    const data = await db.queryOne('SELECT * FROM pelanggan WHERE id = ?', [id]);
    await db.insert('activity_logs', {
      userId: (req as any).user?.id ?? null,
      action: 'update', module: 'pelanggan',
      targetId: id, targetName: data?.name,
    });
    sendSuccess(res, data, 'Pelanggan berhasil diperbarui');
  } catch (e) { next(e); }
});

// DELETE /pelanggan/:id — soft delete (set deletedAt)
router.delete('/:id', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const pelanggan = await db.queryOne<{ name: string }>('SELECT name FROM pelanggan WHERE id = ? AND deletedAt IS NULL', [id]);
    if (!pelanggan) throw new NotFoundError('Pelanggan');

    await db.transaction(async (tx) => {
      await tx.update('pelanggan', { deletedAt: new Date() }, 'id = ?', [id]);
      await tx.execute('UPDATE kendaraan SET deletedAt = NOW() WHERE pelangganId = ? AND deletedAt IS NULL', [id]);
      await tx.insert('activity_logs', {
        userId: (req as any).user?.id ?? null,
        action: 'delete', module: 'pelanggan',
        targetId: id, targetName: pelanggan.name,
      });
    });
    sendSuccess(res, null, 'Pelanggan berhasil dihapus (soft delete)');
  } catch (e) { next(e); }
});

// POST /pelanggan/:id/restore — kembalikan pelanggan yang di-soft-delete
router.post('/:id/restore', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    await db.update('pelanggan', { deletedAt: null, updatedAt: new Date() }, 'id = ?', [id]);
    await db.execute('UPDATE kendaraan SET deletedAt = NULL WHERE pelangganId = ?', [id]);
    const data = await db.queryOne('SELECT * FROM pelanggan WHERE id = ?', [id]);
    await db.insert('activity_logs', {
      userId: (req as any).user?.id ?? null,
      action: 'restore', module: 'pelanggan',
      targetId: id, targetName: data?.name,
    });
    sendSuccess(res, data, 'Pelanggan berhasil dikembalikan');
  } catch (e) { next(e); }
});

// POST /pelanggan/:id/merge-into — gabungkan sourceId ke targetId
// Semua kendaraan & SPK & loyaltyPoints dipindahkan ke targetId,
// lalu source di-soft-delete.
router.post('/:id/merge-into', requireRole('Admin'), validate(mergeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sourceId = Number(req.params.id);
    const { targetId } = req.body as { targetId: number };
    if (sourceId === targetId) throw new BadRequestError('Source dan target tidak boleh sama');

    const [source, target] = await Promise.all([
      db.queryOne<any>('SELECT * FROM pelanggan WHERE id = ? AND deletedAt IS NULL', [sourceId]),
      db.queryOne<any>('SELECT * FROM pelanggan WHERE id = ? AND deletedAt IS NULL', [targetId]),
    ]);
    if (!source) throw new NotFoundError('Pelanggan sumber');
    if (!target) throw new NotFoundError('Pelanggan target');

    const result = await db.transaction(async (tx) => {
      const ken = await tx.execute('UPDATE kendaraan SET pelangganId = ? WHERE pelangganId = ?', [targetId, sourceId]);
      const spk = await tx.execute('UPDATE spk SET pelangganId = ? WHERE pelangganId = ?', [targetId, sourceId]);
      const loy = await tx.execute('UPDATE loyalty_points SET pelangganId = ? WHERE pelangganId = ?', [targetId, sourceId]);
      await tx.update('pelanggan', { deletedAt: new Date() }, 'id = ?', [sourceId]);
      await tx.insert('activity_logs', {
        userId: (req as any).user?.id ?? null,
        action: 'merge', module: 'pelanggan',
        targetId: targetId,
        targetName: `${source.name} → ${target.name}`,
        detail: JSON.stringify({ sourceId, targetId, kendaraan: ken.affectedRows, spk: spk.affectedRows, loyaltyPoints: loy.affectedRows }),
      });
      return { kendaraan: ken.affectedRows, spk: spk.affectedRows, loyaltyPoints: loy.affectedRows };
    });
    sendSuccess(res, result, `Berhasil menggabungkan "${source.name}" ke "${target.name}"`);
  } catch (e) { next(e); }
});

export default router;
