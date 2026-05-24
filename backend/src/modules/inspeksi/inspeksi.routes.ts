import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import db from '../../config/db';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendSuccess, sendCreated } from '../../shared/utils';
import { NotFoundError, BadRequestError } from '../../shared/errors';

const createInspeksiSchema = z.object({
  kendaraanId: z.number().int().positive(),
  tanggal: z.string().transform(v => new Date(v)).optional(),
  odometer: z.number().int().min(0).optional(),
  catatan: z.string().optional(),
  kondisi: z.record(z.string(), z.any()).optional(),
  foto: z.array(z.string()).optional(),
});

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { kendaraanId } = req.query;
    const conds: string[] = [];
    const params: any[] = [];
    if (kendaraanId) { conds.push('i.kendaraanId = ?'); params.push(Number(kendaraanId)); }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const rows = await db.query(
      `SELECT i.*, k.name AS kName, k.plat AS kPlat, k.pelangganId,
              p.name AS pName, p.phone AS pPhone
       FROM inspeksi i
       LEFT JOIN kendaraan k ON k.id = i.kendaraanId
       LEFT JOIN pelanggan p ON p.id = k.pelangganId
       ${where} ORDER BY i.tanggal DESC`, params);
    const data = rows.map((r: any) => ({
      ...r,
      kondisi: typeof r.kondisi === 'string' ? JSON.parse(r.kondisi) : r.kondisi,
      foto: typeof r.foto === 'string' ? JSON.parse(r.foto) : r.foto,
      kendaraan: { id: r.kendaraanId, name: r.kName, plat: r.kPlat, pelanggan: { id: r.pelangganId, name: r.pName, phone: r.pPhone } },
    }));
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const r = await db.queryOne<any>(
      `SELECT i.*, k.name AS kName, k.plat AS kPlat, k.pelangganId,
              p.name AS pName, p.phone AS pPhone
       FROM inspeksi i
       LEFT JOIN kendaraan k ON k.id = i.kendaraanId
       LEFT JOIN pelanggan p ON p.id = k.pelangganId
       WHERE i.id = ?`, [id]);
    if (!r) throw new NotFoundError('Inspeksi');
    r.kondisi = typeof r.kondisi === 'string' ? JSON.parse(r.kondisi) : r.kondisi;
    r.foto = typeof r.foto === 'string' ? JSON.parse(r.foto) : r.foto;
    r.kendaraan = { id: r.kendaraanId, name: r.kName, plat: r.kPlat, pelanggan: { id: r.pelangganId, name: r.pName, phone: r.pPhone } };
    sendSuccess(res, r);
  } catch (e) { next(e); }
});

router.post('/', validate(createInspeksiSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validasi odometer tidak boleh lebih kecil dari nilai saat ini
    if (req.body.odometer && req.body.kendaraanId) {
      const kendaraan = await db.queryOne<{ odometer: number | null }>('SELECT odometer FROM kendaraan WHERE id = ?', [req.body.kendaraanId]);
      if (kendaraan && kendaraan.odometer !== null && req.body.odometer < kendaraan.odometer) {
        throw new BadRequestError(`Odometer tidak boleh lebih kecil dari nilai terakhir (${kendaraan.odometer} km)`);
      }
    }
    const body = { ...req.body };
    if (body.kondisi && typeof body.kondisi === 'object') body.kondisi = JSON.stringify(body.kondisi);
    if (body.foto && Array.isArray(body.foto)) body.foto = JSON.stringify(body.foto);
    const newId = await db.insert('inspeksi', body);
    const data = await db.queryOne('SELECT * FROM inspeksi WHERE id = ?', [newId]);
    if (req.body.odometer) {
      await db.update('kendaraan', { odometer: req.body.odometer, updatedAt: new Date() }, 'id = ?', [req.body.kendaraanId]);
    }
    sendCreated(res, data, 'Inspeksi berhasil dicatat');
  } catch (e) { next(e); }
});

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    // Prevent editing locked inspeksi
    const existing = await db.queryOne<any>('SELECT * FROM inspeksi WHERE id = ?', [id]);
    if (!existing) throw new NotFoundError('Inspeksi');
    if (existing.status === 'locked' && req.body.status !== 'locked') {
      res.status(400).json({ success: false, message: 'Inspeksi ini sudah terkunci dan tidak dapat diubah.' });
      return;
    }
    const body = { ...req.body };
    if (body.kondisi && typeof body.kondisi === 'object') body.kondisi = JSON.stringify(body.kondisi);
    if (body.foto && Array.isArray(body.foto)) body.foto = JSON.stringify(body.foto);
    await db.update('inspeksi', { ...body, updatedAt: new Date() }, 'id = ?', [id]);
    const data = await db.queryOne('SELECT * FROM inspeksi WHERE id = ?', [id]);
    sendSuccess(res, data, 'Inspeksi berhasil diperbarui');
  } catch (e) { next(e); }
});

export default router;
