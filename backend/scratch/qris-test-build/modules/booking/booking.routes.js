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
// GET /booking — List all bookings (Admin) with search, date filters
router.get('/', auth_1.authMiddleware, async (req, res, next) => {
    try {
        const status = req.query.status;
        const search = req.query.search;
        const dateFrom = req.query.dateFrom;
        const dateTo = req.query.dateTo;
        const page = parseInt(req.query.page || '1');
        const limit = parseInt(req.query.limit || '20');
        const skip = (page - 1) * limit;
        const conds = [];
        const params = [];
        if (status && status !== 'semua') {
            conds.push('b.status = ?');
            params.push(status);
        }
        if (search && search.trim()) {
            conds.push('(b.nama LIKE ? OR b.whatsapp LIKE ? OR b.layanan LIKE ? OR b.merkTipe LIKE ? OR b.platNomor LIKE ?)');
            const s = `%${search}%`;
            params.push(s, s, s, s, s);
        }
        if (dateFrom) {
            conds.push('b.createdAt >= ?');
            params.push(new Date(dateFrom));
        }
        if (dateTo) {
            const end = new Date(dateTo);
            end.setHours(23, 59, 59, 999);
            conds.push('b.createdAt <= ?');
            params.push(end);
        }
        const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
        const [data, totalRow] = await Promise.all([
            db_1.default.query(`SELECT b.*, p.id AS pId, p.name AS pName, p.phone AS pPhone,
                s.id AS sId, s.noWo, s.status AS sStatus
         FROM bookings b
         LEFT JOIN pelanggan p ON p.id = b.pelangganId
         LEFT JOIN work_orders s ON s.id = b.woId
         ${where} ORDER BY b.createdAt DESC LIMIT ? OFFSET ?`, [...params, limit, skip]),
            db_1.default.queryOne(`SELECT COUNT(*) AS c FROM bookings b ${where}`, params),
        ]);
        const total = totalRow?.c ?? 0;
        const rows = data.map((r) => ({
            ...r,
            pelanggan: r.pId ? { id: r.pId, name: r.pName, phone: r.pPhone } : null,
            spk: r.sId ? { id: r.sId, noWo: r.noWo, status: r.sStatus } : null,
        }));
        (0, utils_1.sendSuccess)(res, {
            data: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (e) {
        next(e);
    }
});
// GET /booking/stats — Booking statistics (Admin)
router.get('/stats', auth_1.authMiddleware, async (_req, res, next) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [r1, r2, r3, r4, r5] = await Promise.all([
            db_1.default.queryVal('SELECT COUNT(*) FROM bookings'),
            db_1.default.queryVal("SELECT COUNT(*) FROM bookings WHERE status = 'baru'"),
            db_1.default.queryVal("SELECT COUNT(*) FROM bookings WHERE status = 'dikonfirmasi'"),
            db_1.default.queryVal('SELECT COUNT(*) FROM bookings WHERE createdAt >= ?', [today]),
            db_1.default.queryVal('SELECT COUNT(*) FROM bookings WHERE woId IS NOT NULL'),
        ]);
        const total = r1, baru = r2, dikonfirmasi = r3, todayCount = r4, converted = r5;
        (0, utils_1.sendSuccess)(res, {
            total,
            baru,
            dikonfirmasi,
            hari_ini: todayCount,
            converted,
            conversionRate: total > 0 ? Math.round((converted / total) * 100) : 0,
        });
    }
    catch (e) {
        next(e);
    }
});
// PUT /booking/:id — Update booking status + catatan (Admin)
router.put('/:id', auth_1.authMiddleware, (0, auth_1.requirePermission)('monitoring', 'edit'), async (req, res, next) => {
    try {
        const id = parseInt(String(req.params.id));
        const { status, catatan, alasanPenolakan } = req.body;
        // Validasi status
        const validStatuses = ['baru', 'dikonfirmasi', 'selesai', 'dibatalkan', 'ditolak'];
        if (status && !validStatuses.includes(status)) {
            res.status(400).json({ success: false, message: 'Status tidak valid' });
            return;
        }
        const updateData = {};
        if (status)
            updateData.status = status;
        if (catatan !== undefined)
            updateData.catatan = catatan;
        if (alasanPenolakan !== undefined && status === 'ditolak')
            updateData.alasanPenolakan = alasanPenolakan;
        // Auto-match pelanggan by WhatsApp saat dikonfirmasi
        if (status === 'dikonfirmasi') {
            const currentBooking = await db_1.default.queryOne('SELECT * FROM bookings WHERE id = ?', [id]);
            if (currentBooking && !currentBooking.pelangganId) {
                const normalizedPhone = currentBooking.whatsapp.replace(/^0/, '62').replace(/[^0-9]/g, '');
                const existingPelanggan = await db_1.default.queryOne('SELECT id FROM pelanggan WHERE phone IN (?, ?, ?) AND deletedAt IS NULL LIMIT 1', [currentBooking.whatsapp, normalizedPhone, currentBooking.whatsapp.replace(/^62/, '0')]);
                if (existingPelanggan) {
                    updateData.pelangganId = existingPelanggan.id;
                }
            }
        }
        await db_1.default.update('bookings', { ...updateData, updatedAt: new Date() }, 'id = ?', [id]);
        const booking = await db_1.default.queryOne(`SELECT b.*, p.id AS pId, p.name AS pName, s.id AS sId, s.noWo
       FROM bookings b LEFT JOIN pelanggan p ON p.id = b.pelangganId LEFT JOIN work_orders s ON s.id = b.woId
       WHERE b.id = ?`, [id]);
        if (booking) {
            booking.pelanggan = booking.pId ? { id: booking.pId, name: booking.pName } : null;
            booking.spk = booking.sId ? { id: booking.sId, noWo: booking.noWo } : null;
        }
        (0, utils_1.sendSuccess)(res, booking, 'Status booking diperbarui');
    }
    catch (e) {
        next(e);
    }
});
// POST /booking/:id/convert-to-spk — Convert booking to SPK
router.post('/:id/convert-to-spk', auth_1.authMiddleware, (0, auth_1.requirePermission)('monitoring', 'edit'), async (req, res, next) => {
    try {
        const bookingId = parseInt(String(req.params.id));
        const booking = await db_1.default.queryOne('SELECT * FROM bookings WHERE id = ?', [bookingId]);
        if (!booking) {
            res.status(404).json({ success: false, message: 'Booking tidak ditemukan' });
            return;
        }
        if (booking.woId) {
            res.status(400).json({ success: false, message: `Booking sudah dikonversi ke SPK #${booking.woId}` });
            return;
        }
        // Determine mode from layanan
        let mode = 'rutin';
        const layananLower = booking.layanan.toLowerCase();
        if (layananLower.includes('modif'))
            mode = 'modifikasi';
        else if (layananLower.includes('bubut'))
            mode = 'bubut';
        // Find or create pelanggan
        let pelangganId = booking.pelangganId;
        if (!pelangganId) {
            const normalizedPhone = booking.whatsapp.replace(/^0/, '62').replace(/[^0-9]/g, '');
            const existing = await db_1.default.queryOne('SELECT id FROM pelanggan WHERE phone IN (?, ?, ?) AND deletedAt IS NULL LIMIT 1', [booking.whatsapp, normalizedPhone, booking.whatsapp.replace(/^62/, '0')]);
            if (existing) {
                pelangganId = existing.id;
            }
            else {
                pelangganId = await db_1.default.insert('pelanggan', {
                    name: booking.nama,
                    phone: booking.whatsapp,
                    type: mode === 'bubut' ? 'bubut' : 'kendaraan',
                });
            }
        }
        // Find kendaraan by plat if available
        let kendaraanId = null;
        if (booking.platNomor && mode !== 'bubut') {
            const kendaraan = await db_1.default.queryOne('SELECT id FROM kendaraan WHERE pelangganId = ? AND plat LIKE ? AND deletedAt IS NULL LIMIT 1', [pelangganId, `%${booking.platNomor}%`]);
            if (kendaraan) {
                kendaraanId = kendaraan.id;
            }
            else if (booking.merkTipe || booking.jenisKendaraan) {
                kendaraanId = await db_1.default.insert('kendaraan', {
                    pelangganId: pelangganId,
                    name: booking.merkTipe || booking.jenisKendaraan,
                    plat: booking.platNomor || '-',
                });
            }
        }
        // Get user from auth
        const userId = req.user?.id || 1;
        // Create SPK
        const noWo = (0, utils_1.generateWoNo)();
        const woId = await db_1.default.insert('spk', {
            noWo,
            pelangganId: pelangganId,
            kendaraanId,
            mode,
            keluhan: booking.keluhan || `Booking Online #${booking.id}: ${booking.layanan}`,
            createdById: userId,
            status: 'antri',
        });
        // Link booking to SPK and update status
        await db_1.default.update('bookings', { woId, pelangganId, status: 'dikonfirmasi', updatedAt: new Date() }, 'id = ?', [bookingId]);
        (0, utils_1.sendSuccess)(res, {
            woId,
            noWo,
            pelangganId,
            kendaraanId,
        }, `Booking berhasil dikonversi ke SPK ${noWo}`);
    }
    catch (e) {
        next(e);
    }
});
// DELETE /booking/:id — Delete booking (Admin)
router.delete('/:id', auth_1.authMiddleware, (0, auth_1.requirePermission)('monitoring', 'full'), async (req, res, next) => {
    try {
        const id = parseInt(String(req.params.id));
        await db_1.default.execute('DELETE FROM bookings WHERE id = ?', [id]);
        (0, utils_1.sendSuccess)(res, null, 'Booking dihapus');
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=booking.routes.js.map