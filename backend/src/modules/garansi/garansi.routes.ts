import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import db from '../../config/db';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { sendSuccess, sendCreated, sendPaginated, parsePagination } from '../../shared/utils';
import { BadRequestError, NotFoundError } from '../../shared/errors';

const claimSchema = z.object({
  garansiId: z.number().int().positive(),
  reason: z.string().min(3, 'Alasan klaim minimal 3 karakter'),
});

const claimUpdateSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'resolved']),
  resolution: z.string().optional(),
});

const router = Router();
router.use(authMiddleware);

// GET /garansi
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, type } = req.query;
    const conds: string[] = [];
    const params: any[] = [];
    if (status && status !== 'semua') { conds.push('g.status = ?'); params.push(status); }
    if (type) { conds.push('g.type = ?'); params.push(type); }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const rows = await db.query(
      `SELECT g.*, s.noSpk, s.pelangganId, s.kendaraanId,
              p.name AS pelangganName, p.phone AS pelangganPhone,
              k.name AS kendaraanName, k.plat AS kendaraanPlat
       FROM garansi g
       LEFT JOIN spk s ON s.id = g.spkId
       LEFT JOIN pelanggan p ON p.id = s.pelangganId
       LEFT JOIN kendaraan k ON k.id = s.kendaraanId
       ${where} ORDER BY g.endDate ASC`, params);
    // Fetch claims for all garansi
    const gIds = rows.map((r: any) => r.id);
    const claims = gIds.length ? await db.query('SELECT * FROM garansi_claims WHERE garansiId IN (?)', [gIds]) : [];
    const claimMap = new Map<number, any[]>();
    for (const c of claims) { if (!claimMap.has(c.garansiId)) claimMap.set(c.garansiId, []); claimMap.get(c.garansiId)!.push(c); }

    const now = new Date();
    const enriched = rows.map((g: any) => {
      const diffMs = new Date(g.endDate).getTime() - now.getTime();
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      let computedStatus = g.status;
      if (daysLeft <= 0) computedStatus = 'expired';
      else if (daysLeft <= 7) computedStatus = 'hampir';
      else computedStatus = 'aktif';
      return {
        ...g, daysLeft, computedStatus,
        spk: { id: g.spkId, noSpk: g.noSpk, pelanggan: { id: g.pelangganId, name: g.pelangganName, phone: g.pelangganPhone }, kendaraan: g.kendaraanId ? { id: g.kendaraanId, name: g.kendaraanName, plat: g.kendaraanPlat } : null },
        claims: claimMap.get(g.id) || [],
      };
    });
    sendSuccess(res, enriched);
  } catch (e) { next(e); }
});

// POST /garansi/sync-status — Auto-update garansi statuses in DB
router.post('/sync-status', requireRole('Admin'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const almostExpiredDate = new Date();
    almostExpiredDate.setDate(now.getDate() + 7);

    const result = await db.transaction(async (tx) => {
      const r1 = await tx.execute(
        "UPDATE garansi SET status = 'expired' WHERE endDate <= ? AND status != 'expired'", [now]);
      const r2 = await tx.execute(
        "UPDATE garansi SET status = 'hampir' WHERE endDate > ? AND endDate <= ? AND status NOT IN ('expired','hampir')",
        [now, almostExpiredDate]);
      const r3 = await tx.execute(
        "UPDATE garansi SET status = 'aktif' WHERE endDate > ? AND status != 'aktif'", [almostExpiredDate]);
      return { expired: r1.affectedRows, hampir: r2.affectedRows, aktif: r3.affectedRows };
    });

    sendSuccess(res, result, 'Sinkronisasi status garansi berhasil');
  } catch (e) { next(e); }
});

// GET /garansi/claims
router.get('/claims', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await db.query(
      `SELECT gc.*, g.itemName, g.type AS garansiType, g.startDate, g.endDate, g.status AS garansiStatus,
              s.noSpk, p.name AS pelangganName, p.phone AS pelangganPhone
       FROM garansi_claims gc
       LEFT JOIN garansi g ON g.id = gc.garansiId
       LEFT JOIN spk s ON s.id = g.spkId
       LEFT JOIN pelanggan p ON p.id = s.pelangganId
       ORDER BY gc.createdAt DESC`);
    const rows = data.map((r: any) => ({
      ...r,
      garansi: { id: r.garansiId, itemName: r.itemName, type: r.garansiType, startDate: r.startDate, endDate: r.endDate, status: r.garansiStatus,
        spk: { noSpk: r.noSpk, pelanggan: { name: r.pelangganName, phone: r.pelangganPhone } } },
    }));
    sendSuccess(res, rows);
  } catch (e) { next(e); }
});

// POST /garansi/claim
router.post('/claim', validate(claimSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { garansiId, reason } = req.body;
    
    // Validasi apakah garansi sudah expired
    const garansi = await db.queryOne<any>('SELECT * FROM garansi WHERE id = ?', [garansiId]);
    if (!garansi) throw new NotFoundError('Garansi');
    if (new Date(garansi.endDate) < new Date() || garansi.status === 'expired') {
      throw new BadRequestError('Masa berlaku garansi ini sudah habis dan tidak dapat diklaim lagi.');
    }

    const claimId = await db.insert('garansi_claims', { garansiId, reason });
    const claim = await db.queryOne('SELECT * FROM garansi_claims WHERE id = ?', [claimId]);
    sendCreated(res, claim, 'Klaim garansi berhasil dibuat');
  } catch (e) { next(e); }
});

// PUT /garansi/claim/:id — resolve claim
router.put('/claim/:id', requireRole('Admin'), validate(claimUpdateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const claimId = Number(req.params.id);
    await db.update('garansi_claims', { status: req.body.status, resolution: req.body.resolution, updatedAt: new Date() }, 'id = ?', [claimId]);
    const data = await db.queryOne('SELECT * FROM garansi_claims WHERE id = ?', [claimId]);
    sendSuccess(res, data, 'Klaim berhasil diperbarui');
  } catch (e) { next(e); }
});

export default router;
