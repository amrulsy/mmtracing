import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import db from '../../config/db';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendSuccess, sendCreated } from '../../shared/utils';

const router = Router();
router.use(authMiddleware);

const createSchema = z.object({
  spkId: z.number().int().positive().optional(),
  mekanikId: z.number().int().positive().optional(),
  tanggal: z.string().transform(v => new Date(v)),
  jamMulai: z.string().min(1),
  jamSelesai: z.string().min(1),
  namaBooking: z.string().min(1),
  pekerjaan: z.string().optional(),
  kategori: z.enum(['servis', 'modifikasi', 'bubut', 'booking', 'fleet']).default('servis'),
  warna: z.string().optional(),
});

// GET /jadwal — week-based
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, mekanikId } = req.query;
    const conds: string[] = [];
    const params: any[] = [];
    if (startDate && endDate) {
      conds.push('j.tanggal >= ? AND j.tanggal <= ?');
      params.push(new Date(startDate as string), new Date(endDate as string));
    }
    if (mekanikId) { conds.push('j.mekanikId = ?'); params.push(Number(mekanikId)); }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const data = await db.query(
      `SELECT j.*, s.noSpk, s.status AS spkStatus,
              m.name AS mekanikName, m.initial AS mekanikInitial
       FROM jadwal j
       LEFT JOIN spk s ON s.id = j.spkId
       LEFT JOIN mekanik m ON m.id = j.mekanikId
       ${where} ORDER BY j.tanggal ASC`,
      params,
    );
    const result = data.map((r: any) => ({
      ...r,
      spk: r.noSpk ? { noSpk: r.noSpk, status: r.spkStatus } : null,
      mekanik: r.mekanikName ? { name: r.mekanikName, initial: r.mekanikInitial } : null,
    }));
    sendSuccess(res, result);
  } catch (e) { next(e); }
});

// POST /jadwal
router.post('/', validate(createSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = await db.insert('jadwal', req.body);
    const data = await db.queryOne('SELECT * FROM jadwal WHERE id = ?', [id]);
    sendCreated(res, data, 'Jadwal berhasil ditambahkan');
  } catch (e) { next(e); }
});

// PUT /jadwal/:id
router.put('/:id', requireRole('Admin', 'Mekanik'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    await db.update('jadwal', { ...req.body, updatedAt: new Date() }, 'id = ?', [id]);
    const data = await db.queryOne('SELECT * FROM jadwal WHERE id = ?', [id]);
    sendSuccess(res, data, 'Jadwal berhasil diperbarui');
  } catch (e) { next(e); }
});

// DELETE /jadwal/:id
router.delete('/:id', requireRole('Admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db.execute('DELETE FROM jadwal WHERE id = ?', [Number(req.params.id)]);
    sendSuccess(res, null, 'Jadwal berhasil dihapus');
  } catch (e) { next(e); }
});

export default router;
