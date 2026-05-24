import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import db from '../../config/db';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendSuccess, sendCreated, sendPaginated, parsePagination } from '../../shared/utils';
import { NotFoundError, BadRequestError } from '../../shared/errors';
import { normalizePlat, isValidPlat } from '../../shared/validators';

const router = Router();
router.use(authMiddleware);

const platMsg = { message: 'Format plat tidak valid (contoh: B 1234 ABC)' };

const createSchema = z.object({
  pelangganId: z.number().int().positive(),
  name: z.string().min(1),
  plat: z.string().min(1).refine(isValidPlat, platMsg),
  tahun: z.string().optional(),
  warna: z.string().optional(),
  noRangka: z.string().optional(),
  noMesin: z.string().optional(),
  odometer: z.number().int().optional(),
  photoUrl: z.string().url().optional().or(z.literal('')),
  nextServiceDate: z.string().datetime().optional().or(z.literal('')),
  nextServiceKm: z.number().int().optional(),
});

const updateSchema = z.object({
  pelangganId: z.number().int().positive().optional(),
  name: z.string().min(1).optional(),
  plat: z.string().min(1).refine(isValidPlat, platMsg).optional(),
  tahun: z.string().optional(),
  warna: z.string().optional(),
  noRangka: z.string().optional(),
  noMesin: z.string().optional(),
  odometer: z.number().int().optional(),
  photoUrl: z.string().url().optional().or(z.literal('')),
  nextServiceDate: z.string().datetime().optional().or(z.literal('')).nullable(),
  nextServiceKm: z.number().int().optional().nullable(),
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { pelangganId, search, includeDeleted } = req.query;
    const conds: string[] = [];
    const params: any[] = [];
    if (!includeDeleted) conds.push('k.deletedAt IS NULL');
    if (pelangganId) { conds.push('k.pelangganId = ?'); params.push(Number(pelangganId)); }
    if (search) { conds.push('(k.name LIKE ? OR k.plat LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const [data, totalRow] = await Promise.all([
      db.query(
        `SELECT k.*, p.id AS pId, p.name AS pName, p.phone AS pPhone
         FROM kendaraan k LEFT JOIN pelanggan p ON p.id = k.pelangganId
         ${where} ORDER BY k.updatedAt DESC LIMIT ? OFFSET ?`,
        [...params, limit, skip]),
      db.queryOne<{ c: number }>(`SELECT COUNT(*) AS c FROM kendaraan k ${where}`, params),
    ]);
    const rows = data.map((r: any) => ({ ...r, pelanggan: { id: r.pId, name: r.pName, phone: r.pPhone } }));
    sendPaginated(res, rows, totalRow?.c ?? 0, page, limit);
  } catch (e) { next(e); }
});

// GET /kendaraan/reminders — kendaraan yang butuh servis (by date atau km)
router.get('/reminders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date();
    const in7Days = new Date(); in7Days.setDate(today.getDate() + 7);
    const in30Days = new Date(); in30Days.setDate(today.getDate() + 30);

    const due = await db.query(
      `SELECT k.*, p.id AS pId, p.name AS pName, p.phone AS pPhone, lt.name AS tierName
       FROM kendaraan k
       LEFT JOIN pelanggan p ON p.id = k.pelangganId
       LEFT JOIN loyalty_tiers lt ON lt.id = p.loyaltyTierId
       WHERE k.deletedAt IS NULL AND k.nextServiceDate IS NOT NULL AND k.nextServiceDate <= ?
       ORDER BY k.nextServiceDate ASC LIMIT 100`,
      [in30Days],
    );

    const items = due.map((k: any) => {
      const date = k.nextServiceDate ? new Date(k.nextServiceDate) : null;
      const isOverdue = !!(date && date < today);
      const isDueSoon = !!(date && date >= today && date <= in7Days);
      return {
        ...k,
        pelanggan: { id: k.pId, name: k.pName, phone: k.pPhone, loyaltyTier: k.tierName ? { name: k.tierName } : null },
        reminderStatus: isOverdue ? 'overdue' : isDueSoon ? 'due_soon' : 'upcoming',
      };
    });
    sendSuccess(res, items);
  } catch (e) { next(e); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const data = await db.queryOne('SELECT * FROM kendaraan WHERE id = ? AND deletedAt IS NULL', [id]);
    if (!data) throw new NotFoundError('Kendaraan');
    const [pelanggan, spks, inspeksis] = await Promise.all([
      db.queryOne('SELECT * FROM pelanggan WHERE id = ?', [data.pelangganId]),
      db.query(
        `SELECT s.*, m.name AS mekanikName FROM spk s LEFT JOIN mekanik m ON m.id = s.mekanikId
         WHERE s.kendaraanId = ? ORDER BY s.createdAt DESC LIMIT 10`, [id]),
      db.query('SELECT * FROM inspeksi WHERE kendaraanId = ? ORDER BY tanggal DESC LIMIT 5', [id]),
    ]);
    (data as any).pelanggan = pelanggan;
    (data as any).spk = spks.map((s: any) => ({ ...s, mekanik: s.mekanikName ? { name: s.mekanikName } : null }));
    (data as any).inspeksi = inspeksis;
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

router.post('/', validate(createSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = { ...req.body, plat: normalizePlat(req.body.plat) };
    const newId = await db.insert('kendaraan', body);
    const data = await db.queryOne('SELECT * FROM kendaraan WHERE id = ?', [newId]);
    await db.insert('activity_logs', {
      userId: (req as any).user?.id ?? null,
      action: 'create', module: 'master',
      targetId: newId, targetName: `${body.name} (${body.plat})`,
    });
    sendCreated(res, data, 'Kendaraan berhasil ditambahkan');
  } catch (e) { next(e); }
});

router.put('/:id', validate(updateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body: any = { ...req.body };
    if (body.plat) body.plat = normalizePlat(body.plat);
    if (body.nextServiceDate === '' || body.nextServiceDate === null) body.nextServiceDate = null;
    else if (body.nextServiceDate) body.nextServiceDate = new Date(body.nextServiceDate);
    const id = Number(req.params.id);
    await db.update('kendaraan', { ...body, updatedAt: new Date() }, 'id = ?', [id]);
    const data = await db.queryOne('SELECT * FROM kendaraan WHERE id = ?', [id]);
    await db.insert('activity_logs', {
      userId: (req as any).user?.id ?? null,
      action: 'update', module: 'master',
      targetId: id, targetName: `${data?.name} (${data?.plat})`,
    });
    sendSuccess(res, data, 'Kendaraan berhasil diperbarui');
  } catch (e) { next(e); }
});

// DELETE /kendaraan/:id — soft delete
router.delete('/:id', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const kendaraan = await db.queryOne<{ name: string; plat: string }>(
      'SELECT name, plat FROM kendaraan WHERE id = ? AND deletedAt IS NULL', [id]);
    if (!kendaraan) throw new NotFoundError('Kendaraan');

    await db.transaction(async (tx) => {
      await tx.update('kendaraan', { deletedAt: new Date() }, 'id = ?', [id]);
      await tx.insert('activity_logs', {
        userId: (req as any).user?.id ?? null,
        action: 'delete', module: 'master',
        targetId: id, targetName: `${kendaraan.name} (${kendaraan.plat})`,
      });
    });
    sendSuccess(res, null, 'Kendaraan berhasil dihapus');
  } catch (e) { next(e); }
});

// POST /kendaraan/:id/restore
router.post('/:id/restore', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    await db.update('kendaraan', { deletedAt: null, updatedAt: new Date() }, 'id = ?', [id]);
    const data = await db.queryOne('SELECT * FROM kendaraan WHERE id = ?', [id]);
    await db.insert('activity_logs', {
      userId: (req as any).user?.id ?? null,
      action: 'restore', module: 'master',
      targetId: id, targetName: `${data?.name} (${data?.plat})`,
    });
    sendSuccess(res, data, 'Kendaraan berhasil dikembalikan');
  } catch (e) { next(e); }
});

export default router;
