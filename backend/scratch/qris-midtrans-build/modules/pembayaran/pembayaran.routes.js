"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const utils_1 = require("../../shared/utils");
const rateLimit_1 = require("../../middleware/rateLimit");
const pembayaran_service_1 = require("./pembayaran.service");
const qris_service_1 = require("./qris.service");
const publicReceiptLimiter = (0, rateLimit_1.createRateLimiter)({
    windowMs: 30 * 60 * 1000,
    max: 10,
    message: 'Terlalu banyak percobaan akses. Silakan coba lagi nanti.',
});
const router = (0, express_1.Router)();
// GET /pembayaran/pub/:publicId — Public E-Kwitansi dengan PIN (Tanpa Auth)
router.get('/pub/:publicId', publicReceiptLimiter, async (req, res, next) => {
    try {
        const pin = typeof req.query.pin === 'string' ? req.query.pin : '';
        const publicId = typeof req.params.publicId === 'string' ? req.params.publicId : String(req.params.publicId);
        const data = await pembayaran_service_1.pembayaranService.getPublicReceipt(publicId, pin);
        (0, utils_1.sendSuccess)(res, data);
    }
    catch (e) {
        next(e);
    }
});
const bayarSchema = zod_1.z.object({
    jumlah: zod_1.z.number().positive('Jumlah harus lebih dari 0'),
    metode: zod_1.z.string().min(1),
    keterangan: zod_1.z.string().optional(),
    qrisAttemptId: zod_1.z.string().uuid().optional(),
    qrisReference: zod_1.z.string().trim().min(4).max(100).optional(),
    qrisVerified: zod_1.z.boolean().optional(),
});
router.post('/:id/qris', auth_1.authMiddleware, (0, auth_1.requirePermission)('pembayaran', 'edit'), (0, validate_1.validate)(zod_1.z.object({
    jumlah: zod_1.z.number().int().min(1).max(10000000),
})), async (req, res, next) => {
    try {
        (0, utils_1.sendSuccess)(res, await (0, qris_service_1.createQrisAttempt)(Number(req.params.id), req.body.jumlah, req.user.id));
    }
    catch (e) {
        next(e);
    }
});
// GET /pembayaran
router.get('/', auth_1.authMiddleware, async (req, res, next) => {
    try {
        const { data, total, page, limit } = await pembayaran_service_1.pembayaranService.findAll(req.query);
        (0, utils_1.sendPaginated)(res, data, total, page, limit);
    }
    catch (e) {
        next(e);
    }
});
// GET /pembayaran/summary — ringkasan keuangan
router.get('/summary', auth_1.authMiddleware, async (_req, res, next) => {
    try {
        const data = await pembayaran_service_1.pembayaranService.getSummary();
        (0, utils_1.sendSuccess)(res, data);
    }
    catch (e) {
        next(e);
    }
});
// GET /pembayaran/:id
router.get('/:id', auth_1.authMiddleware, async (req, res, next) => {
    try {
        const id = Number(req.params.id);
        const data = await pembayaran_service_1.pembayaranService.findById(id);
        (0, utils_1.sendSuccess)(res, data);
    }
    catch (e) {
        next(e);
    }
});
// POST /pembayaran/:id/bayar — Bayar (parsial / lunas)
router.post('/:id/bayar', auth_1.authMiddleware, (0, auth_1.requirePermission)('pembayaran', 'edit'), (0, validate_1.validate)(bayarSchema), async (req, res, next) => {
    try {
        const data = await pembayaran_service_1.pembayaranService.bayar(Number(req.params.id), req.body, req.user?.id);
        (0, utils_1.sendSuccess)(res, data, `Pembayaran Rp ${req.body.jumlah.toLocaleString('id-ID')} berhasil dicatat.`);
    }
    catch (e) {
        next(e);
    }
});
// POST /pembayaran/:id/refund — Rollback lunas: reset invoice, hapus garansi & poin
router.post('/:id/refund', auth_1.authMiddleware, (0, auth_1.requirePermission)('pembayaran', 'full'), async (req, res, next) => {
    try {
        const data = await pembayaran_service_1.pembayaranService.refund(Number(req.params.id), req.user?.id);
        (0, utils_1.sendSuccess)(res, data, 'Invoice berhasil di-refund. Garansi dan poin terkait telah dihapus.');
    }
    catch (e) {
        next(e);
    }
});
exports.default = router;
//# sourceMappingURL=pembayaran.routes.js.map