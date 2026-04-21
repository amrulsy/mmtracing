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
    const reward = await prisma.loyaltyReward.findUnique({ where: { id: rewardId } });
    if (!reward || reward.stock <= 0) return res.status(400).json({ success: false, message: 'Reward tidak tersedia' });

    // Check poin cukup
    const totalEarned = await prisma.loyaltyPoint.aggregate({ where: { pelangganId, type: 'earn' }, _sum: { points: true } });
    const totalRedeemed = await prisma.loyaltyPoint.aggregate({ where: { pelangganId, type: 'redeem' }, _sum: { points: true } });
    const balance = (totalEarned._sum.points || 0) - Math.abs(totalRedeemed._sum.points || 0);

    if (balance < reward.pointsCost) return res.status(400).json({ success: false, message: `Poin tidak cukup (saldo: ${balance})` });

    await prisma.loyaltyPoint.create({
      data: { pelangganId, type: 'redeem', points: -reward.pointsCost, description: `Redeem: ${reward.name}`, refType: 'redeem', refId: rewardId },
    });
    await prisma.loyaltyReward.update({ where: { id: rewardId }, data: { stock: { decrement: 1 } } });
    sendSuccess(res, { balance: balance - reward.pointsCost }, 'Poin berhasil ditukar');
  } catch (e) { next(e); }
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
