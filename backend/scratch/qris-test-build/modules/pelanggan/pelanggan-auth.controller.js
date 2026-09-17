"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pelangganAuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../../config/db"));
const env_1 = require("../../config/env");
const utils_1 = require("../../shared/utils");
const errors_1 = require("../../shared/errors");
exports.pelangganAuthController = {
    async register(req, res, next) {
        try {
            const { name, phone, password } = req.body;
            if (!name || !phone || !password) {
                throw new errors_1.BadRequestError('Nama, No WhatsApp, dan Password wajib diisi');
            }
            // Check existing
            const existing = await db_1.default.queryOne("SELECT id FROM pelanggan WHERE phone = ?", [phone]);
            if (existing) {
                throw new errors_1.BadRequestError('Nomor WhatsApp sudah terdaftar. Silakan login.');
            }
            const hashedPassword = await bcryptjs_1.default.hash(password, 10);
            const insertId = await db_1.default.insert('pelanggan', {
                name,
                phone,
                password: hashedPassword,
                type: 'kendaraan',
                role: 'customer',
                createdAt: new Date(),
                updatedAt: new Date()
            });
            (0, utils_1.sendSuccess)(res, { id: insertId }, 'Registrasi berhasil, silakan login', 201);
        }
        catch (error) {
            next(error);
        }
    },
    async login(req, res, next) {
        try {
            const { phone, password } = req.body;
            if (!phone || !password) {
                throw new errors_1.BadRequestError('No WhatsApp dan Password wajib diisi');
            }
            const user = await db_1.default.queryOne("SELECT id, name, password FROM pelanggan WHERE phone = ?", [phone]);
            if (!user || !user.password) {
                throw new errors_1.UnauthorizedError('Nomor WhatsApp atau Password salah');
            }
            const isValid = await bcryptjs_1.default.compare(password, user.password);
            if (!isValid) {
                throw new errors_1.UnauthorizedError('Nomor WhatsApp atau Password salah');
            }
            const token = jsonwebtoken_1.default.sign({ userId: user.id, isCustomer: true }, env_1.env.jwt.secret, { expiresIn: '15m' });
            const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id, isCustomer: true, isRefresh: true }, env_1.env.jwt.refreshSecret, { expiresIn: env_1.env.jwt.refreshExpiresIn });
            (0, utils_1.sendSuccess)(res, {
                token,
                refreshToken,
                user: { id: user.id, name: user.name, phone }
            }, 'Login berhasil');
        }
        catch (error) {
            next(error);
        }
    },
    async refreshToken(req, res, next) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken)
                throw new errors_1.BadRequestError('Refresh token wajib diisi');
            const decoded = jsonwebtoken_1.default.verify(refreshToken, env_1.env.jwt.refreshSecret);
            if (!decoded.isRefresh || !decoded.isCustomer)
                throw new errors_1.UnauthorizedError('Token tidak valid untuk refresh');
            const user = await db_1.default.queryOne('SELECT id FROM pelanggan WHERE id = ?', [decoded.userId]);
            if (!user)
                throw new errors_1.UnauthorizedError('User tidak ditemukan');
            const newToken = jsonwebtoken_1.default.sign({ userId: user.id, isCustomer: true }, env_1.env.jwt.secret, { expiresIn: '15m' });
            const newRefreshToken = jsonwebtoken_1.default.sign({ userId: user.id, isCustomer: true, isRefresh: true }, env_1.env.jwt.refreshSecret, { expiresIn: env_1.env.jwt.refreshExpiresIn });
            (0, utils_1.sendSuccess)(res, { token: newToken, refreshToken: newRefreshToken }, 'Token berhasil diperbarui');
        }
        catch (error) {
            next(new errors_1.UnauthorizedError('Refresh token tidak valid atau sudah kedaluwarsa'));
        }
    },
    async me(req, res, next) {
        try {
            // @ts-ignore
            const customerId = req.customerId;
            const user = await db_1.default.queryOne("SELECT id, name, phone, email, address, totalTrx, photoUrl, loyaltyTierId, createdAt FROM pelanggan WHERE id = ?", [customerId]);
            if (!user)
                throw new errors_1.UnauthorizedError('User tidak ditemukan');
            // Also fetch registered vehicles
            const kendaraan = await db_1.default.query("SELECT id, name, plat, tahun, warna, noRangka, noMesin, odometer, createdAt, updatedAt FROM kendaraan WHERE pelangganId = ? AND deletedAt IS NULL", [customerId]);
            user.kendaraan = kendaraan;
            (0, utils_1.sendSuccess)(res, user, 'Data pelanggan berhasil diambil');
        }
        catch (error) {
            next(error);
        }
    },
    async history(req, res, next) {
        try {
            // @ts-ignore
            const customerId = req.customerId;
            // Get SPKs (Surat Perintah Kerja)
            const spk = await db_1.default.query(`SELECT id, noWo, status, progress, totalHarga, totalBayar, 
                (totalHarga - COALESCE(totalBayar,0)) AS sisaTagihan,
                (totalHarga - COALESCE(diskon,0)) AS totalTagihan,
                mode, createdAt
         FROM work_orders 
         WHERE pelangganId = ? 
         ORDER BY createdAt DESC LIMIT 20`, [customerId]);
            // We might not have a direct link from Bookings to pelangganId yet, 
            // but let's query bookings by phone number for now.
            const user = await db_1.default.queryOne("SELECT phone FROM pelanggan WHERE id = ?", [customerId]);
            let bookings = [];
            if (user && user.phone) {
                bookings = await db_1.default.query(`SELECT id, jenisKendaraan, merkTipe, layanan, tanggal, jamPreferensi, status, createdAt
           FROM bookings
           WHERE whatsapp = ?
           ORDER BY createdAt DESC LIMIT 10`, [user.phone]);
            }
            (0, utils_1.sendSuccess)(res, { spk, activeWo: spk, workOrder: spk, bookings }, 'Riwayat berhasil diambil');
        }
        catch (error) {
            next(error);
        }
    },
    async spkDetail(req, res, next) {
        try {
            // @ts-ignore
            const customerId = req.customerId;
            const woId = Number(req.params.id);
            // Verify ownership
            const spk = await db_1.default.queryOne("SELECT * FROM work_orders WHERE id = ? AND pelangganId = ?", [woId, customerId]);
            if (!spk)
                throw new errors_1.NotFoundError('Work Order tidak ditemukan atau Anda tidak memiliki akses');
            // Fetch related data
            const [kendaraan, mekanik, items, stages, photos, pembayaran] = await Promise.all([
                spk.kendaraanId ? db_1.default.queryOne("SELECT * FROM kendaraan WHERE id = ?", [spk.kendaraanId]) : null,
                spk.mekanikId ? db_1.default.queryOne("SELECT * FROM mekanik WHERE id = ?", [spk.mekanikId]) : null,
                db_1.default.query("SELECT i.*, sp.name AS spName, j.name AS jName FROM wo_items i LEFT JOIN sparepart sp ON sp.id = i.sparepartId LEFT JOIN jasa j ON j.id = i.jasaId WHERE i.woId = ?", [woId]),
                db_1.default.query("SELECT * FROM wo_stages WHERE woId = ? ORDER BY urutan ASC", [woId]),
                db_1.default.query("SELECT * FROM wo_photos WHERE woId = ? ORDER BY createdAt DESC", [woId]),
                db_1.default.query("SELECT * FROM pembayaran WHERE woId = ? LIMIT 1", [woId])
            ]);
            const enrichedItems = items.map((i) => ({
                ...i,
                sparepart: i.sparepartId ? { id: i.sparepartId, name: i.spName } : null,
                jasa: i.jasaId ? { id: i.jasaId, name: i.jName } : null,
            }));
            spk.kendaraan = kendaraan;
            spk.mekanik = mekanik;
            spk.items = enrichedItems;
            spk.stages = stages;
            spk.photos = photos;
            spk.pembayaran = pembayaran.length > 0 ? pembayaran[0] : null;
            (0, utils_1.sendSuccess)(res, spk, 'Detail SPK berhasil diambil');
        }
        catch (error) {
            next(error);
        }
    },
    async updateProfile(req, res, next) {
        try {
            // @ts-ignore
            const customerId = req.customerId;
            const { name, email, address } = req.body;
            if (!name)
                throw new errors_1.BadRequestError('Nama wajib diisi');
            await db_1.default.update('pelanggan', { name, email, address, updatedAt: new Date() }, 'id = ?', [customerId]);
            const updatedUser = await db_1.default.queryOne("SELECT id, name, phone, email, address, totalTrx, photoUrl, loyaltyTierId, createdAt FROM pelanggan WHERE id = ?", [customerId]);
            (0, utils_1.sendSuccess)(res, updatedUser, 'Profil berhasil diperbarui');
        }
        catch (error) {
            next(error);
        }
    },
    async uploadAvatar(req, res, next) {
        try {
            // @ts-ignore
            const customerId = req.customerId;
            const file = req.file;
            if (!file)
                throw new errors_1.BadRequestError('File gambar wajib diupload');
            const url = `/uploads/${file.filename}`;
            await db_1.default.update('pelanggan', { photoUrl: url, updatedAt: new Date() }, 'id = ?', [customerId]);
            (0, utils_1.sendSuccess)(res, { url }, 'Foto profil berhasil diperbarui');
        }
        catch (error) {
            next(error);
        }
    },
    async getPembayaran(req, res, next) {
        try {
            // @ts-ignore
            const customerId = req.customerId;
            const tagihan = await db_1.default.query(`
        SELECT p.*, s.noWo, s.status AS woStatus
        FROM pembayaran p
        JOIN work_orders s ON s.id = p.woId
        WHERE s.pelangganId = ?
        ORDER BY p.createdAt DESC
      `, [customerId]);
            const tagihanIds = tagihan.map((t) => t.id);
            let details = [];
            if (tagihanIds.length > 0) {
                details = await db_1.default.query(`SELECT * FROM pembayaran_detail WHERE pembayaranId IN (?) ORDER BY createdAt DESC`, [tagihanIds]);
            }
            const enrichedTagihan = tagihan.map((t) => ({
                ...t,
                details: details.filter((d) => d.pembayaranId === t.id)
            }));
            (0, utils_1.sendSuccess)(res, enrichedTagihan, 'Riwayat tagihan berhasil diambil');
        }
        catch (error) {
            next(error);
        }
    },
    async getLoyalty(req, res, next) {
        try {
            // @ts-ignore
            const customerId = req.customerId;
            const [earnedRow, redeemedRow, currentTierRow] = await Promise.all([
                db_1.default.queryOne("SELECT COALESCE(SUM(points),0) AS earned FROM loyalty_points WHERE pelangganId = ? AND type = 'earn'", [customerId]),
                db_1.default.queryOne("SELECT COALESCE(SUM(ABS(points)),0) AS redeemed FROM loyalty_points WHERE pelangganId = ? AND type = 'redeem'", [customerId]),
                db_1.default.queryOne("SELECT lt.* FROM loyalty_tiers lt JOIN pelanggan p ON p.loyaltyTierId = lt.id WHERE p.id = ?", [customerId])
            ]);
            const earned = earnedRow?.earned || 0;
            const redeemed = redeemedRow?.redeemed || 0;
            const balance = earned - redeemed;
            let nextTier = null;
            if (currentTierRow) {
                nextTier = await db_1.default.queryOne("SELECT name, minPoints FROM loyalty_tiers WHERE minPoints > ? ORDER BY minPoints ASC LIMIT 1", [currentTierRow.minPoints]);
            }
            else {
                nextTier = await db_1.default.queryOne("SELECT name, minPoints FROM loyalty_tiers ORDER BY minPoints ASC LIMIT 1");
            }
            (0, utils_1.sendSuccess)(res, { balance, tier: currentTierRow, nextTier }, 'Data loyalty berhasil diambil');
        }
        catch (error) {
            next(error);
        }
    },
    async getLoyaltyHistory(req, res, next) {
        try {
            // @ts-ignore
            const customerId = req.customerId;
            const history = await db_1.default.query("SELECT * FROM loyalty_points WHERE pelangganId = ? ORDER BY createdAt DESC LIMIT 50", [customerId]);
            (0, utils_1.sendSuccess)(res, history, 'Riwayat poin berhasil diambil');
        }
        catch (error) {
            next(error);
        }
    },
    async getLoyaltyRewards(req, res, next) {
        try {
            const rewards = await db_1.default.query("SELECT * FROM loyalty_rewards WHERE isActive = 1 ORDER BY pointsCost ASC");
            (0, utils_1.sendSuccess)(res, rewards, 'Katalog reward berhasil diambil');
        }
        catch (error) {
            next(error);
        }
    },
    async redeemLoyalty(req, res, next) {
        try {
            // @ts-ignore
            const customerId = req.customerId;
            const { rewardId } = req.body;
            if (!rewardId)
                throw new errors_1.BadRequestError('rewardId wajib diisi');
            const result = await db_1.default.transaction(async (tx) => {
                const reward = await tx.queryOne('SELECT * FROM loyalty_rewards WHERE id = ? FOR UPDATE', [rewardId]);
                if (!reward || !reward.isActive)
                    throw new Error('Reward tidak tersedia');
                if (reward.stock <= 0)
                    throw new Error('Stok reward habis');
                const [earnedRow, redeemedRow] = await Promise.all([
                    tx.queryOne("SELECT COALESCE(SUM(points),0) AS t FROM loyalty_points WHERE pelangganId = ? AND type = 'earn'", [customerId]),
                    tx.queryOne("SELECT COALESCE(SUM(ABS(points)),0) AS t FROM loyalty_points WHERE pelangganId = ? AND type = 'redeem'", [customerId]),
                ]);
                const balance = (earnedRow?.t || 0) - (redeemedRow?.t || 0);
                if (balance < reward.pointsCost)
                    throw new Error(`Poin tidak cukup (saldo: ${balance}, dibutuhkan: ${reward.pointsCost})`);
                await tx.insert('loyalty_points', {
                    pelangganId: customerId, type: 'redeem', points: -reward.pointsCost,
                    description: `Redeem: ${reward.name}`, refType: 'redeem', refId: rewardId,
                });
                const r = await tx.execute('UPDATE loyalty_rewards SET stock = stock - 1 WHERE id = ? AND stock > 0', [rewardId]);
                if (r.affectedRows === 0)
                    throw new Error('Stok reward habis saat proses simultan');
                return balance - reward.pointsCost;
            });
            (0, utils_1.sendSuccess)(res, { balance: result }, 'Poin berhasil ditukar');
        }
        catch (error) {
            if (error.message && !error.code)
                return res.status(400).json({ success: false, message: error.message });
            next(error);
        }
    },
    async getGaransi(req, res, next) {
        try {
            // @ts-ignore
            const customerId = req.customerId;
            const rows = await db_1.default.query(`
        SELECT g.*, s.noWo 
        FROM garansi g
        JOIN work_orders s ON s.id = g.woId
        WHERE s.pelangganId = ?
        ORDER BY g.endDate ASC
      `, [customerId]);
            const gIds = rows.map((r) => r.id);
            const claims = gIds.length ? await db_1.default.query('SELECT * FROM garansi_claims WHERE garansiId IN (?)', [gIds]) : [];
            const claimMap = new Map();
            for (const c of claims) {
                if (!claimMap.has(c.garansiId))
                    claimMap.set(c.garansiId, []);
                claimMap.get(c.garansiId).push(c);
            }
            const now = new Date();
            const enriched = rows.map((g) => {
                const diffMs = new Date(g.endDate).getTime() - now.getTime();
                const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                let computedStatus = g.status;
                if (daysLeft <= 0)
                    computedStatus = 'expired';
                else if (daysLeft <= 7)
                    computedStatus = 'hampir';
                else
                    computedStatus = 'aktif';
                return {
                    ...g, daysLeft, computedStatus,
                    claims: claimMap.get(g.id) || [],
                };
            });
            (0, utils_1.sendSuccess)(res, enriched, 'Daftar garansi berhasil diambil');
        }
        catch (error) {
            next(error);
        }
    },
    async claimGaransi(req, res, next) {
        try {
            // @ts-ignore
            const customerId = req.customerId;
            const { garansiId, reason } = req.body;
            if (!garansiId || !reason)
                throw new errors_1.BadRequestError('garansiId dan alasan klaim wajib diisi');
            const garansi = await db_1.default.queryOne(`
        SELECT g.* FROM garansi g
        JOIN work_orders s ON s.id = g.woId
        WHERE g.id = ? AND s.pelangganId = ?
      `, [garansiId, customerId]);
            if (!garansi)
                throw new errors_1.NotFoundError('Garansi tidak ditemukan atau Anda tidak memiliki akses');
            if (new Date(garansi.endDate) < new Date() || garansi.status === 'expired') {
                throw new errors_1.BadRequestError('Masa berlaku garansi ini sudah habis dan tidak dapat diklaim.');
            }
            const claimId = await db_1.default.insert('garansi_claims', { garansiId, reason });
            const claim = await db_1.default.queryOne('SELECT * FROM garansi_claims WHERE id = ?', [claimId]);
            (0, utils_1.sendSuccess)(res, claim, 'Klaim garansi berhasil diajukan', 201);
        }
        catch (error) {
            next(error);
        }
    },
    async getNotifikasi(req, res, next) {
        try {
            // @ts-ignore
            const customerId = req.customerId;
            const { page = 1, limit = 20 } = req.query;
            const limitNum = Math.min(100, Math.max(1, Number(limit)));
            const skip = (Math.max(1, Number(page)) - 1) * limitNum;
            const spkIdsRes = await db_1.default.query("SELECT id FROM work_orders WHERE pelangganId = ?", [customerId]);
            const spkIds = spkIdsRes.map((r) => r.id);
            let whereClause = "pelangganId = ?";
            let params = [customerId];
            if (spkIds.length > 0) {
                whereClause = `(pelangganId = ? OR woId IN (?))`;
                params.push(spkIds);
            }
            const rows = await db_1.default.query(`SELECT * FROM notifikasi WHERE ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`, [...params, limitNum, skip]);
            const totalRes = await db_1.default.queryOne(`SELECT COUNT(*) AS c FROM notifikasi WHERE ${whereClause}`, params);
            const unreadRes = await db_1.default.queryOne(`SELECT COUNT(*) AS c FROM notifikasi WHERE ${whereClause} AND isRead = 0`, params);
            res.status(200).json({
                success: true,
                data: {
                    notifikasi: rows,
                    unreadCount: unreadRes?.c || 0,
                    total: totalRes?.c || 0,
                    page: Number(page),
                    limit: limitNum
                }
            });
        }
        catch (error) {
            next(error);
        }
    },
    async markReadAllNotifikasi(req, res, next) {
        try {
            // @ts-ignore
            const customerId = req.customerId;
            const spkIdsRes = await db_1.default.query("SELECT id FROM work_orders WHERE pelangganId = ?", [customerId]);
            const spkIds = spkIdsRes.map((r) => r.id);
            let whereClause = "pelangganId = ?";
            let params = [customerId];
            if (spkIds.length > 0) {
                whereClause = `(pelangganId = ? OR woId IN (?))`;
                params.push(spkIds);
            }
            await db_1.default.execute(`UPDATE notifikasi SET isRead = 1 WHERE ${whereClause} AND isRead = 0`, params);
            (0, utils_1.sendSuccess)(res, null, 'Semua notifikasi ditandai dibaca');
        }
        catch (error) {
            next(error);
        }
    },
    async submitReview(req, res, next) {
        try {
            // @ts-ignore
            const customerId = req.customerId;
            const { woId, rating, comment, tags } = req.body;
            if (!woId || !rating || rating < 1 || rating > 5) {
                throw new errors_1.BadRequestError('Work Order ID dan Rating (1-5) wajib diisi');
            }
            const spk = await db_1.default.queryOne("SELECT id, status FROM work_orders WHERE id = ? AND pelangganId = ?", [woId, customerId]);
            if (!spk)
                throw new errors_1.NotFoundError('Work Order tidak ditemukan atau Anda tidak memiliki akses');
            if (spk.status !== 'selesai')
                throw new errors_1.BadRequestError('Review hanya dapat diberikan untuk servis yang sudah selesai');
            const existing = await db_1.default.queryOne("SELECT id FROM customer_reviews WHERE woId = ?", [woId]);
            if (existing)
                throw new errors_1.ConflictError('Anda sudah memberikan review untuk SPK ini');
            await db_1.default.insert('customer_reviews', {
                woId, pelangganId: customerId, rating, comment,
                tags: tags ? JSON.stringify(tags) : null,
                isPublic: true
            });
            (0, utils_1.sendSuccess)(res, null, 'Terima kasih atas ulasan Anda!', 201);
        }
        catch (error) {
            next(error);
        }
    },
    async checkReview(req, res, next) {
        try {
            // @ts-ignore
            const customerId = req.customerId;
            const woId = Number(req.params.woId);
            const review = await db_1.default.queryOne("SELECT * FROM customer_reviews WHERE woId = ? AND pelangganId = ?", [woId, customerId]);
            (0, utils_1.sendSuccess)(res, review || null, 'Data review berhasil diambil');
        }
        catch (error) {
            next(error);
        }
    }
};
//# sourceMappingURL=pelanggan-auth.controller.js.map