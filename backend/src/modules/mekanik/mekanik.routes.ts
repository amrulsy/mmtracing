import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import db from '../../config/db';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendSuccess, sendCreated, sendPaginated, parsePagination } from '../../shared/utils';
import { NotFoundError, BadRequestError } from '../../shared/errors';

const router = Router();
router.use(authMiddleware);

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  spesialisasi: z.string().optional(),
  initial: z.string().max(5).optional(),
  color: z.string().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  spesialisasi: z.string().optional(),
  initial: z.string().max(5).optional(),
  color: z.string().optional(),
  status: z.enum(['available', 'busy', 'offline']).optional(),
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const conds: string[] = [];
    const params: any[] = [];
    if (status) { conds.push('m.status = ?'); params.push(status); }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const mekaniks = await db.query(
      `SELECT m.*, (SELECT COUNT(*) FROM spk WHERE mekanikId = m.id) AS _countSpk
       FROM mekanik m ${where} ORDER BY m.name ASC`,
      params,
    );
    // Attach active SPKs
    if (mekaniks.length) {
      const ids = mekaniks.map((m: any) => m.id);
      const activeSpk = await db.query(
        'SELECT id, noSpk, status, mekanikId FROM spk WHERE mekanikId IN (?) AND status = ?',
        [ids, 'dikerjakan'],
      );
      const map = new Map<number, any[]>();
      for (const s of activeSpk) { if (!map.has(s.mekanikId)) map.set(s.mekanikId, []); map.get(s.mekanikId)!.push(s); }
      for (const m of mekaniks) (m as any).spk = map.get(m.id) || [];
    }
    sendSuccess(res, mekaniks);
  } catch (e) { next(e); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const data = await db.queryOne('SELECT * FROM mekanik WHERE id = ?', [id]);
    if (!data) throw new NotFoundError('Mekanik');
    const [spks, jadwals] = await Promise.all([
      db.query(
        `SELECT s.*, p.id AS pelangganId, p.name AS pelangganName, p.phone AS pelangganPhone,
                k.id AS kendaraanId, k.name AS kendaraanName, k.plat AS kendaraanPlat
         FROM spk s
         LEFT JOIN pelanggan p ON p.id = s.pelangganId
         LEFT JOIN kendaraan k ON k.id = s.kendaraanId
         WHERE s.mekanikId = ? ORDER BY s.createdAt DESC LIMIT 20`, [id]),
      db.query('SELECT * FROM jadwal WHERE mekanikId = ? ORDER BY tanggal DESC LIMIT 10', [id]),
    ]);
    (data as any).spk = spks.map((s: any) => ({
      ...s,
      pelanggan: { id: s.pelangganId, name: s.pelangganName, phone: s.pelangganPhone },
      kendaraan: s.kendaraanId ? { id: s.kendaraanId, name: s.kendaraanName, plat: s.kendaraanPlat } : null,
    }));
    (data as any).jadwal = jadwals;
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

router.post('/', requireRole('Admin'), validate(createSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newId = await db.insert('mekanik', req.body);
    const data = await db.queryOne('SELECT * FROM mekanik WHERE id = ?', [newId]);
    await db.insert('activity_logs', {
      userId: (req as any).user?.id ?? null,
      action: 'create', module: 'master',
      targetId: newId, targetName: req.body.name,
    });
    sendCreated(res, data, 'Mekanik berhasil ditambahkan');
  } catch (e) { next(e); }
});

router.put('/:id', requireRole('Admin'), validate(updateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    await db.update('mekanik', { ...req.body, updatedAt: new Date() }, 'id = ?', [id]);
    const data = await db.queryOne('SELECT * FROM mekanik WHERE id = ?', [id]);
    await db.insert('activity_logs', {
      userId: (req as any).user?.id ?? null,
      action: 'update', module: 'master',
      targetId: id, targetName: data?.name,
    });
    sendSuccess(res, data, 'Mekanik berhasil diperbarui');
  } catch (e) { next(e); }
});

router.delete('/:id', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const mekanik = await db.queryOne<{ name: string }>('SELECT name FROM mekanik WHERE id = ?', [id]);
    const spkCount = await db.queryVal<number>('SELECT COUNT(*) FROM spk WHERE mekanikId = ?', [id]);
    if (spkCount > 0) {
      throw new BadRequestError(`Mekanik ini masih terhubung dengan ${spkCount} SPK dan tidak dapat dihapus.`);
    }
    await db.execute('DELETE FROM mekanik WHERE id = ?', [id]);
    await db.insert('activity_logs', {
      userId: (req as any).user?.id ?? null,
      action: 'delete', module: 'master',
      targetId: id, targetName: mekanik?.name,
    });
    sendSuccess(res, null, 'Mekanik berhasil dihapus');
  } catch (e) { next(e); }
});

export default router;
