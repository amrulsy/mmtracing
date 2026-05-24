import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import db from '../../config/db';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendSuccess, sendCreated, sendPaginated, parsePagination } from '../../shared/utils';
import { BadRequestError } from '../../shared/errors';

const router = Router();
router.use(authMiddleware);

const createSchema = z.object({
  kategoriId: z.number().int().positive(),
  tanggal: z.string().transform(v => new Date(v)).optional(),
  deskripsi: z.string().min(1),
  jumlah: z.number().positive(),
  metode: z.string().min(1),
  oleh: z.string().optional(),
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { kategoriId, month, year } = req.query;
    const conds: string[] = [];
    const params: any[] = [];
    if (kategoriId) { conds.push('pe.kategoriId = ?'); params.push(Number(kategoriId)); }
    if (month && year) {
      const start = new Date(Number(year), Number(month as string) - 1, 1);
      const end = new Date(Number(year), Number(month as string), 0, 23, 59, 59);
      conds.push('pe.tanggal >= ? AND pe.tanggal <= ?'); params.push(start, end);
    }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const [data, totalRow] = await Promise.all([
      db.query(
        `SELECT pe.*, kp.name AS kategoriName
         FROM pengeluaran pe LEFT JOIN kategori_pengeluaran kp ON kp.id = pe.kategoriId
         ${where} ORDER BY pe.tanggal DESC LIMIT ? OFFSET ?`,
        [...params, limit, skip]),
      db.queryOne<{ c: number }>(`SELECT COUNT(*) AS c FROM pengeluaran pe ${where}`, params),
    ]);
    const rows = data.map((r: any) => ({ ...r, kategori: r.kategoriId ? { id: r.kategoriId, name: r.kategoriName } : null }));
    sendPaginated(res, rows, totalRow?.c ?? 0, page, limit);
  } catch (e) { next(e); }
});

router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [bulanIniRow, bulanLaluRow, byKategori, categories] = await Promise.all([
      db.queryOne<{ total: number; cnt: number }>(
        'SELECT COALESCE(SUM(jumlah),0) AS total, COUNT(*) AS cnt FROM pengeluaran WHERE tanggal >= ?', [thisMonth]),
      db.queryOne<{ total: number }>(
        'SELECT COALESCE(SUM(jumlah),0) AS total FROM pengeluaran WHERE tanggal >= ? AND tanggal <= ?', [lastMonth, lastMonthEnd]),
      db.query(
        `SELECT kategoriId, COALESCE(SUM(jumlah),0) AS _sumJumlah, COUNT(*) AS _count
         FROM pengeluaran WHERE tanggal >= ? GROUP BY kategoriId`, [thisMonth]),
      db.query('SELECT * FROM kategori_pengeluaran'),
    ]);

    const breakdown = byKategori.map((k: any) => ({
      ...k,
      kategori: categories.find((c: any) => c.id === k.kategoriId)?.name || 'Lainnya',
    }));

    sendSuccess(res, {
      bulanIni: bulanIniRow?.total || 0,
      bulanIniCount: bulanIniRow?.cnt || 0,
      bulanLalu: bulanLaluRow?.total || 0,
      breakdown,
    });
  } catch (e) { next(e); }
});

router.get('/categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await db.query('SELECT * FROM kategori_pengeluaran ORDER BY name ASC');
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

router.post('/categories', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newId = await db.insert('kategori_pengeluaran', { name: req.body.name });
    const data = await db.queryOne('SELECT * FROM kategori_pengeluaran WHERE id = ?', [newId]);
    sendCreated(res, data);
  } catch (e) { next(e); }
});

router.put('/categories/:id', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const katId = Number(req.params.id);
    await db.update('kategori_pengeluaran', { name: req.body.name }, 'id = ?', [katId]);
    const data = await db.queryOne('SELECT * FROM kategori_pengeluaran WHERE id = ?', [katId]);
    sendSuccess(res, data, 'Kategori berhasil diperbarui');
  } catch (e) { next(e); }
});

router.delete('/categories/:id', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const inUse = await db.queryVal<number>('SELECT COUNT(*) FROM pengeluaran WHERE kategoriId = ?', [id]);
    if (inUse > 0) {
      throw new BadRequestError(`Kategori ini masih digunakan oleh ${inUse} pengeluaran dan tidak dapat dihapus.`);
    }
    await db.execute('DELETE FROM kategori_pengeluaran WHERE id = ?', [id]);
    sendSuccess(res, null, 'Kategori berhasil dihapus');
  } catch (e) { next(e); }
});

router.post('/', validate(createSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newId = await db.insert('pengeluaran', req.body);
    const data = await db.queryOne('SELECT * FROM pengeluaran WHERE id = ?', [newId]);
    sendCreated(res, data, 'Pengeluaran berhasil dicatat');
  } catch (e) { next(e); }
});

router.put('/:id', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const peId = Number(req.params.id);
    await db.update('pengeluaran', { ...req.body, updatedAt: new Date() }, 'id = ?', [peId]);
    const data = await db.queryOne('SELECT * FROM pengeluaran WHERE id = ?', [peId]);
    sendSuccess(res, data, 'Pengeluaran berhasil diperbarui');
  } catch (e) { next(e); }
});

router.delete('/:id', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db.execute('DELETE FROM pengeluaran WHERE id = ?', [Number(req.params.id)]);
    sendSuccess(res, null, 'Pengeluaran berhasil dihapus');
  } catch (e) { next(e); }
});

export default router;
