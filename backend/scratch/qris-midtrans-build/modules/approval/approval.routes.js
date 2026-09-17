"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../../config/db"));
const utils_1 = require("../../shared/utils");
const errors_1 = require("../../shared/errors");
const router = (0, express_1.Router)();
// PUBLIC route — no auth needed
// GET /approval/:token
router.get('/:token', async (req, res, next) => {
    try {
        const tokenStr = String(req.params.token);
        const approvalToken = await db_1.default.queryOne('SELECT * FROM approval_tokens WHERE token = ?', [tokenStr]);
        if (!approvalToken)
            throw new errors_1.NotFoundError('Token approval');
        const spk = await db_1.default.queryOne('SELECT * FROM work_orders WHERE id = ?', [approvalToken.woId]);
        if (spk) {
            const [pelanggan, kendaraan, mekanik, items, stages] = await Promise.all([
                db_1.default.queryOne('SELECT * FROM pelanggan WHERE id = ?', [spk.pelangganId]),
                spk.kendaraanId ? db_1.default.queryOne('SELECT * FROM kendaraan WHERE id = ?', [spk.kendaraanId]) : null,
                spk.mekanikId ? db_1.default.queryOne('SELECT * FROM mekanik WHERE id = ?', [spk.mekanikId]) : null,
                db_1.default.query('SELECT * FROM wo_items WHERE woId = ?', [spk.id]),
                db_1.default.query('SELECT * FROM wo_stages WHERE woId = ? ORDER BY urutan ASC', [spk.id]),
            ]);
            spk.pelanggan = pelanggan;
            spk.kendaraan = kendaraan;
            spk.mekanik = mekanik;
            spk.items = items;
            spk.stages = stages;
        }
        approvalToken.spk = spk;
        if (new Date() > approvalToken.expiresAt) {
            res.status(410).json({ success: false, message: 'Token sudah expired' });
            return;
        }
        (0, utils_1.sendSuccess)(res, approvalToken);
    }
    catch (e) {
        next(e);
    }
});
// POST /approval/:token — approve or reject
router.post('/:token', async (req, res, next) => {
    try {
        const { action } = req.body; // 'approved' or 'rejected'
        const tokenStr = String(req.params.token);
        const approvalToken = await db_1.default.queryOne('SELECT * FROM approval_tokens WHERE token = ?', [tokenStr]);
        if (!approvalToken)
            throw new errors_1.NotFoundError('Token approval');
        if (approvalToken.status !== 'pending') {
            res.status(400).json({ success: false, message: 'Token sudah direspon' });
            return;
        }
        if (new Date() > approvalToken.expiresAt) {
            res.status(410).json({ success: false, message: 'Token sudah expired' });
            return;
        }
        await db_1.default.update('approval_tokens', { status: action, respondedAt: new Date() }, 'token = ?', [tokenStr]);
        // If approved, buat pembayaran HANYA jika belum ada invoice untuk SPK ini
        if (action === 'approved') {
            const spk = await db_1.default.queryOne('SELECT * FROM work_orders WHERE id = ?', [approvalToken.woId]);
            if (spk) {
                const existingPembayaran = await db_1.default.queryOne('SELECT id FROM pembayaran WHERE woId = ? LIMIT 1', [spk.id]);
                if (!existingPembayaran) {
                    const totalTagihan = Math.max(0, Number(spk.totalHarga) - Number(spk.diskon));
                    const jatuhTempo = new Date();
                    jatuhTempo.setDate(jatuhTempo.getDate() + 30);
                    await db_1.default.insert('pembayaran', {
                        noInvoice: (0, utils_1.generateInvoiceNo)(),
                        woId: spk.id,
                        totalTagihan,
                        sisaBayar: totalTagihan,
                        jatuhTempo,
                    });
                }
            }
        }
        (0, utils_1.sendSuccess)(res, null, `Estimasi berhasil ${action === 'approved' ? 'disetujui' : 'ditolak'}`);
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=approval.routes.js.map