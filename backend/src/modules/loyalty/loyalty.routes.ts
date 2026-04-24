import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { authMiddleware } from '../../middleware/auth';
import { sendSuccess, sendCreated } from '../../shared/utils';

const router = Router();
router.use(authMiddleware);

// GET /loyalty — overview
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [tiers, totalPoints, redeemedThisMonth, totalMembers] = await Promise.all([
      prisma.loyaltyTier.findMany({ orderBy: { minPoints: 'asc' }, include: { _count: { select: { pelanggan: true } } } }),
      prisma.loyaltyPoint.aggregate({ where: { type: 'earn' }, _sum: { points: true } }),
      prisma.loyaltyPoint.aggregate({
        where: { type: 'redeem', createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
        _sum: { points: true },
      }),
      prisma.pelanggan.count({ where: { loyaltyTierId: { not: null } } }),
    ]);
    sendSuccess(res, {
      tiers, totalMembers,
      totalPointsBeredar: (totalPoints._sum.points || 0) - Math.abs(redeemedThisMonth._sum.points || 0),
      redeemedThisMonth: Math.abs(redeemedThisMonth._sum.points || 0),
    });
  } catch (e) { next(e); }
});

// GET /loyalty/rewards
router.get('/rewards', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.loyaltyReward.findMany({ where: { isActive: true }, orderBy: { pointsCost: 'asc' } });
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

    const result = await prisma.$transaction(async (tx) => {
      // Lock reward row dengan update conditional untuk cegah stock negatif
      const reward = await tx.loyaltyReward.findUnique({ where: { id: rewardId } });
      if (!reward || !reward.isActive) {
        throw new Error('Reward tidak tersedia');
      }
      if (reward.stock <= 0) {
        throw new Error('Stok reward habis');
      }

      // Hitung balance di dalam transaksi untuk atomicity
      const [earned, redeemed] = await Promise.all([
        tx.loyaltyPoint.aggregate({ where: { pelangganId, type: 'earn' }, _sum: { points: true } }),
        tx.loyaltyPoint.aggregate({ where: { pelangganId, type: 'redeem' }, _sum: { points: true } }),
      ]);
      const balance = (earned._sum.points || 0) - Math.abs(redeemed._sum.points || 0);
      if (balance < reward.pointsCost) {
        throw new Error(`Poin tidak cukup (saldo: ${balance}, dibutuhkan: ${reward.pointsCost})`);
      }

      await tx.loyaltyPoint.create({
        data: { pelangganId, type: 'redeem', points: -reward.pointsCost, description: `Redeem: ${reward.name}`, refType: 'redeem', refId: rewardId },
      });
      // Guard stock tidak negatif
      const updatedReward = await tx.loyaltyReward.updateMany({
        where: { id: rewardId, stock: { gt: 0 } },
        data: { stock: { decrement: 1 } },
      });
      if (updatedReward.count === 0) {
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
    const data = await prisma.loyaltyPoint.findMany({
      where: { pelangganId: Number(req.params.pelangganId) },
      orderBy: { createdAt: 'desc' }, take: 50,
    });
    sendSuccess(res, data);
  } catch (e) { next(e); }
});

export default router;
