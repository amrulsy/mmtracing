import { Router, Request, Response, NextFunction } from 'express';
import db from '../../config/db';
import { authMiddleware } from '../../middleware/auth';
import { sendSuccess } from '../../shared/utils';

const router = Router();
router.use(authMiddleware);

// GET /search?q=keyword
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string || '').trim();

    // Minimum 2 karakter, otherwise return empty
    if (q.length < 2) {
      return sendSuccess(res, { pelanggan: [], kendaraan: [], spk: [] });
    }

    const like = `%${q}%`;
    const [pelanggan, kendaraanRows, spkRows] = await Promise.all([
      db.query(
        'SELECT id, name, phone FROM pelanggan WHERE (name LIKE ? OR phone LIKE ?) AND deletedAt IS NULL ORDER BY updatedAt DESC LIMIT 5',
        [like, like]),
      db.query(
        `SELECT k.id, k.name, k.plat, p.name AS pelangganName
         FROM kendaraan k LEFT JOIN pelanggan p ON p.id = k.pelangganId
         WHERE (k.name LIKE ? OR k.plat LIKE ?) AND k.deletedAt IS NULL ORDER BY k.updatedAt DESC LIMIT 5`,
        [like, like]),
      db.query(
        `SELECT s.id, s.noSpk, s.status, p.name AS pelangganName, k.plat AS kendaraanPlat
         FROM spk s
         LEFT JOIN pelanggan p ON p.id = s.pelangganId
         LEFT JOIN kendaraan k ON k.id = s.kendaraanId
         WHERE (s.noSpk LIKE ? OR p.name LIKE ? OR k.plat LIKE ?)
         ORDER BY s.updatedAt DESC LIMIT 5`,
        [like, like, like]),
    ]);

    const kendaraan = kendaraanRows.map((r: any) => ({ id: r.id, name: r.name, plat: r.plat, pelanggan: { name: r.pelangganName } }));
    const spk = spkRows.map((r: any) => ({ id: r.id, noSpk: r.noSpk, status: r.status, pelanggan: { name: r.pelangganName }, kendaraan: r.kendaraanPlat ? { plat: r.kendaraanPlat } : null }));

    sendSuccess(res, { pelanggan, kendaraan, spk });
  } catch (e) {
    next(e);
  }
});

export default router;
