import { Router, Request, Response, NextFunction } from 'express';
import db from '../../config/db';
import { authMiddleware } from '../../middleware/auth';
import { sendSuccess, sendCreated } from '../../shared/utils';

const router = Router();
router.use(authMiddleware);

// GET /loyalty — overview
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [tiers, totalPointsRow, redeemedRow, totalMembers] = await Promise.all([
      db.query(
        `SELECT lt.*, (SELECT COUNT(*) FROM pelanggan WHERE loyaltyTierId = lt.id AND deletedAt IS NULL) AS _countPelanggan
         FROM loyalty_tiers lt ORDER BY lt.minPoints ASC`),
      db.queryOne<{ t: number }>("SELECT COALESCE(SUM(points),0) AS t FROM loyalty_points WHERE type = 'earn'"),
      db.queryOne<{ t: number }>("SELECT COALESCE(SUM(ABS(points)),0) AS t FROM loyalty_points WHERE type = 'redeem' AND createdAt >= ?", [thisMonthStart]),
      db.queryVal<number>('SELECT COUNT(*) FROM pelanggan WHERE loyaltyTierId IS NOT NULL AND deletedAt IS NULL'),
    ]);
    const totalEarned = totalPointsRow?.t || 0;
    const redeemed = redeemedRow?.t || 0;
    sendSuccess(res, {
      tiers, totalMembers,
      totalPointsBeredar: totalEarned - redeemed,
      redeemedThisMonth: redeemed,
    });
  } catch (e) { next(e); }
});

// GET /loyalty/rewards
router.get('/rewards', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await db.query('SELECT * FROM loyalty_rewards WHERE isActive = 1 ORDER BY pointsCost ASC');
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

// POST /loyalty/redeem
router.post('/redeem', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pelangganId, rewardId } = req.body;
    if (!pelangganId || !rewardId) {
      return res.status(400).json({ success: false, message: 'pelangganId dan rewardId wajib diisi' });
    }

    const result = await db.transaction(async (tx) => {
      const reward = await tx.queryOne<any>('SELECT * FROM loyalty_rewards WHERE id = ? FOR UPDATE', [rewardId]);
      if (!reward || !reward.isActive) {
        throw new Error('Reward tidak tersedia');
      }
      if (reward.stock <= 0) {
        throw new Error('Stok reward habis');
      }

      const [earnedRow, redeemedRow] = await Promise.all([
        tx.queryOne<{ t: number }>("SELECT COALESCE(SUM(points),0) AS t FROM loyalty_points WHERE pelangganId = ? AND type = 'earn'", [pelangganId]),
        tx.queryOne<{ t: number }>("SELECT COALESCE(SUM(ABS(points)),0) AS t FROM loyalty_points WHERE pelangganId = ? AND type = 'redeem'", [pelangganId]),
      ]);
      const balance = (earnedRow?.t || 0) - (redeemedRow?.t || 0);
      if (balance < reward.pointsCost) {
        throw new Error(`Poin tidak cukup (saldo: ${balance}, dibutuhkan: ${reward.pointsCost})`);
      }

      await tx.insert('loyalty_points', {
        pelangganId, type: 'redeem', points: -reward.pointsCost,
        description: `Redeem: ${reward.name}`, refType: 'redeem', refId: rewardId,
      });
      const r = await tx.execute(
        'UPDATE loyalty_rewards SET stock = stock - 1 WHERE id = ? AND stock > 0', [rewardId]);
      if (r.affectedRows === 0) {
        throw new Error('Stok reward habis saat proses simultan');
      }

      return balance - reward.pointsCost;
    });

    sendSuccess(res, { balance: result }, 'Poin berhasil ditukar');
  } catch (e: any) {
    if (e.message && !e.code) {
      return res.status(400).json({ success: false, message: e.message });
    }
    next(e);
  }
});

// GET /loyalty/history/:pelangganId
router.get('/history/:pelangganId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await db.query(
      'SELECT * FROM loyalty_points WHERE pelangganId = ? ORDER BY createdAt DESC LIMIT 50',
      [Number(req.params.pelangganId)]);
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

export default router;
