"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../../config/db"));
const auth_1 = require("../../middleware/auth");
const utils_1 = require("../../shared/utils");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// GET /loyalty — overview
router.get('/', async (_req, res, next) => {
    try {
        const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const [tiers, totalPointsRow, redeemedRow, totalMembers] = await Promise.all([
            db_1.default.query(`SELECT lt.*, (SELECT COUNT(*) FROM pelanggan WHERE loyaltyTierId = lt.id AND deletedAt IS NULL) AS _countPelanggan
         FROM loyalty_tiers lt ORDER BY lt.minPoints ASC`),
            db_1.default.queryOne("SELECT COALESCE(SUM(points),0) AS t FROM loyalty_points WHERE type = 'earn'"),
            db_1.default.queryOne("SELECT COALESCE(SUM(ABS(points)),0) AS t FROM loyalty_points WHERE type = 'redeem' AND createdAt >= ?", [thisMonthStart]),
            db_1.default.queryVal('SELECT COUNT(*) FROM pelanggan WHERE loyaltyTierId IS NOT NULL AND deletedAt IS NULL'),
        ]);
        const totalEarned = totalPointsRow?.t || 0;
        const redeemed = redeemedRow?.t || 0;
        (0, utils_1.sendSuccess)(res, {
            tiers, totalMembers,
            totalPointsBeredar: totalEarned - redeemed,
            redeemedThisMonth: redeemed,
        });
    }
    catch (e) {
        next(e);
    }
});
// GET /loyalty/rewards
router.get('/rewards', async (_req, res, next) => {
    try {
        const data = await db_1.default.query('SELECT * FROM loyalty_rewards WHERE isActive = 1 ORDER BY pointsCost ASC');
        (0, utils_1.sendSuccess)(res, data);
    }
    catch (e) {
        next(e);
    }
});
// POST /loyalty/redeem
router.post('/redeem', async (req, res, next) => {
    try {
        const { pelangganId, rewardId } = req.body;
        if (!pelangganId || !rewardId) {
            return res.status(400).json({ success: false, message: 'pelangganId dan rewardId wajib diisi' });
        }
        const result = await db_1.default.transaction(async (tx) => {
            const reward = await tx.queryOne('SELECT * FROM loyalty_rewards WHERE id = ? FOR UPDATE', [rewardId]);
            if (!reward || !reward.isActive) {
                throw new Error('Reward tidak tersedia');
            }
            if (reward.stock <= 0) {
                throw new Error('Stok reward habis');
            }
            const [earnedRow, redeemedRow] = await Promise.all([
                tx.queryOne("SELECT COALESCE(SUM(points),0) AS t FROM loyalty_points WHERE pelangganId = ? AND type = 'earn'", [pelangganId]),
                tx.queryOne("SELECT COALESCE(SUM(ABS(points)),0) AS t FROM loyalty_points WHERE pelangganId = ? AND type = 'redeem'", [pelangganId]),
            ]);
            const balance = (earnedRow?.t || 0) - (redeemedRow?.t || 0);
            if (balance < reward.pointsCost) {
                throw new Error(`Poin tidak cukup (saldo: ${balance}, dibutuhkan: ${reward.pointsCost})`);
            }
            await tx.insert('loyalty_points', {
                pelangganId, type: 'redeem', points: -reward.pointsCost,
                description: `Redeem: ${reward.name}`, refType: 'redeem', refId: rewardId,
            });
            const r = await tx.execute('UPDATE loyalty_rewards SET stock = stock - 1 WHERE id = ? AND stock > 0', [rewardId]);
            if (r.affectedRows === 0) {
                throw new Error('Stok reward habis saat proses simultan');
            }
            return balance - reward.pointsCost;
        });
        (0, utils_1.sendSuccess)(res, { balance: result }, 'Poin berhasil ditukar');
    }
    catch (e) {
        if (e.message && !e.code) {
            return res.status(400).json({ success: false, message: e.message });
        }
        next(e);
    }
});
// GET /loyalty/history/:pelangganId
router.get('/history/:pelangganId', async (req, res, next) => {
    try {
        const data = await db_1.default.query('SELECT * FROM loyalty_points WHERE pelangganId = ? ORDER BY createdAt DESC LIMIT 50', [Number(req.params.pelangganId)]);
        (0, utils_1.sendSuccess)(res, data);
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=loyalty.routes.js.map