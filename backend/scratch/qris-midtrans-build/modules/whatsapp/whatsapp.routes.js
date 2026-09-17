"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const whatsapp_service_1 = require("./whatsapp.service");
const auth_1 = require("../../middleware/auth");
const utils_1 = require("../../shared/utils");
const qrcode_1 = __importDefault(require("qrcode"));
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
router.get('/status', async (_req, res, next) => {
    try {
        // Inisialisasi gateway jika belum (init aman dipanggil berkali-kali karena ada flag initialized)
        whatsapp_service_1.whatsappService.init().catch((err) => {
            console.error('[WhatsApp] Error during lazy init:', err);
        });
        let qrDataURL = null;
        if (whatsapp_service_1.whatsappService.status === 'qr' && whatsapp_service_1.whatsappService.qrCode) {
            qrDataURL = await qrcode_1.default.toDataURL(whatsapp_service_1.whatsappService.qrCode);
        }
        (0, utils_1.sendSuccess)(res, {
            status: whatsapp_service_1.whatsappService.status,
            qr: qrDataURL
        });
    }
    catch (e) {
        next(e);
    }
});
router.post('/logout', (0, auth_1.requirePermission)('settings', 'full'), async (_req, res, next) => {
    try {
        await whatsapp_service_1.whatsappService.logout();
        (0, utils_1.sendSuccess)(res, null, 'Berhasil mendaftarkan ulang gateway (Logout)');
    }
    catch (e) {
        next(e);
    }
});
router.post('/retry', (0, auth_1.requirePermission)('settings', 'full'), async (_req, res, next) => {
    try {
        if (whatsapp_service_1.whatsappService.status === 'disconnected' || whatsapp_service_1.whatsappService.status === 'qr') {
            whatsapp_service_1.whatsappService.logout(); // restarts standard
        }
        (0, utils_1.sendSuccess)(res, null, 'Memulai ulang koneksi...');
    }
    catch (e) {
        next(e);
    }
});
router.post('/test', (0, auth_1.requirePermission)('settings', 'full'), async (req, res, next) => {
    try {
        const { phone, message } = req.body;
        if (!phone || !message) {
            return res.status(400).json({ success: false, message: 'Nomor HP dan pesan diperlukan' });
        }
        await whatsapp_service_1.whatsappService.sendMessage(phone, message);
        (0, utils_1.sendSuccess)(res, null, 'Pesan uji coba terkirim');
    }
    catch (e) {
        res.status(400).json({ success: false, message: e.message || 'Gagal mengirim pesan uji coba' });
    }
});
exports.default = router;
//# sourceMappingURL=whatsapp.routes.js.map