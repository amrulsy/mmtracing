import { Router, Request, Response, NextFunction } from 'express';
import db from '../../config/db';
import { authMiddleware } from '../../middleware/auth';
import { sendSuccess } from '../../shared/utils';
import { upload } from '../../middleware/upload';
import { spkService } from '../spk/spk.service';
import { AuthRequest } from '../../middleware/auth';
import { NotFoundError } from '../../shared/errors';

const router = Router();
router.use(authMiddleware);

// GET /monitoring — Kanban board data
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const spks = await db.query(
      `SELECT s.*, p.name AS pelangganName,
              k.name AS kendaraanName, k.plat AS kendaraanPlat,
              m.id AS mekanikId2, m.name AS mekanikName, m.initial AS mekanikInitial, m.color AS mekanikColor
       FROM spk s
       LEFT JOIN pelanggan p ON p.id = s.pelangganId
       LEFT JOIN kendaraan k ON k.id = s.kendaraanId
       LEFT JOIN mekanik m ON m.id = s.mekanikId
       WHERE s.status IN ('antri','dikerjakan','kendala','selesai')
       ORDER BY s.prioritas DESC, s.createdAt ASC`);
    // Batch fetch stages & photos
    const spkIds = spks.map((s: any) => s.id);
    const [stages, photos] = spkIds.length ? await Promise.all([
      db.query('SELECT * FROM spk_stages WHERE spkId IN (?) ORDER BY urutan ASC', [spkIds]),
      db.query('SELECT * FROM spk_photos WHERE spkId IN (?) ORDER BY createdAt DESC', [spkIds]),
    ]) : [[], []];
    const stageMap = new Map<number, any[]>();
    for (const st of stages) { if (!stageMap.has(st.spkId)) stageMap.set(st.spkId, []); stageMap.get(st.spkId)!.push(st); }
    const photoMap = new Map<number, any[]>();
    for (const ph of photos) { if (!photoMap.has(ph.spkId)) photoMap.set(ph.spkId, []); photoMap.get(ph.spkId)!.push(ph); }
    const enriched = spks.map((s: any) => ({
      ...s,
      pelanggan: { name: s.pelangganName },
      kendaraan: s.kendaraanName ? { name: s.kendaraanName, plat: s.kendaraanPlat } : null,
      mekanik: s.mekanikId2 ? { id: s.mekanikId2, name: s.mekanikName, initial: s.mekanikInitial, color: s.mekanikColor } : null,
      stages: stageMap.get(s.id) || [],
      photos: (photoMap.get(s.id) || []).slice(0, 3),
    }));
    const kanban = {
      antri: enriched.filter((s: any) => s.status === 'antri'),
      dikerjakan: enriched.filter((s: any) => s.status === 'dikerjakan'),
      kendala: enriched.filter((s: any) => s.status === 'kendala'),
      selesai: enriched.filter((s: any) => s.status === 'selesai'),
    };
    sendSuccess(res, kanban);
  } catch (e) { next(e); }
});

// GET /monitoring/:id — detail
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const data = await db.queryOne<any>('SELECT * FROM spk WHERE id = ?', [id]);
    if (!data) throw new NotFoundError('SPK');
    const [pelanggan, kendaraan, mekanik, items, stages, photos] = await Promise.all([
      db.queryOne('SELECT * FROM pelanggan WHERE id = ?', [data.pelangganId]),
      data.kendaraanId ? db.queryOne('SELECT * FROM kendaraan WHERE id = ?', [data.kendaraanId]) : null,
      data.mekanikId ? db.queryOne('SELECT * FROM mekanik WHERE id = ?', [data.mekanikId]) : null,
      db.query('SELECT * FROM spk_items WHERE spkId = ?', [id]),
      db.query('SELECT * FROM spk_stages WHERE spkId = ? ORDER BY urutan ASC', [id]),
      db.query('SELECT * FROM spk_photos WHERE spkId = ? ORDER BY createdAt DESC', [id]),
    ]);
    data.pelanggan = pelanggan; data.kendaraan = kendaraan; data.mekanik = mekanik;
    data.items = items; data.stages = stages; data.photos = photos;
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

// PUT /monitoring/:id/status — update status dari Kanban (via spkService agar semua business logic berjalan)
router.put('/:id/status', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await spkService.updateStatus(
      Number(req.params.id),
      { status: req.body.status, catatan: req.body.catatan, progress: req.body.progress },
      req.user?.id,
    );
    sendSuccess(res, data, 'Status berhasil diperbarui');
  } catch (e) { next(e); }
});

// POST /monitoring/:id/foto — upload progress photo
router.post('/:id/foto', upload.single('photo'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: 'File wajib diupload' });
    const photoId = await db.insert('spk_photos', {
      spkId: Number(req.params.id),
      url: `/uploads/${file.filename}`,
      caption: req.body.caption || '',
      type: req.body.type || 'progress',
    });
    const photo = await db.queryOne('SELECT * FROM spk_photos WHERE id = ?', [photoId]);
    sendSuccess(res, photo, 'Foto berhasil diupload');
  } catch (e) { next(e); }
});

export default router;
