"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pelangganOtpController = void 0;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const redis_1 = require("../../config/redis");
const db_1 = __importDefault(require("../../config/db"));
const env_1 = require("../../config/env");
const utils_1 = require("../../shared/utils");
const errors_1 = require("../../shared/errors");
const logger_1 = __importDefault(require("../../config/logger"));
const whatsapp_notification_1 = require("../whatsapp/whatsapp.notification");
exports.pelangganOtpController = {
    async requestOtp(req, res, next) {
        try {
            const { phone } = req.body;
            if (!phone)
                throw new errors_1.BadRequestError('Nomor WhatsApp wajib diisi');
            const phoneClean = String(phone).replace(/[^0-9]/g, '');
            if (!/^(08|628)[0-9]{8,12}$/.test(phoneClean)) {
                throw new errors_1.BadRequestError('Format WhatsApp tidak valid. Gunakan 08xx atau 628xx.');
            }
            // Generate 6-digit OTP
            const otp = crypto_1.default.randomInt(100000, 999999).toString();
            // Store in Redis or Memory (Valid for 5 minutes)
            await (0, redis_1.safeSetex)(`OTP:${phoneClean}`, 300, otp);
            // Log OTP to terminal
            logger_1.default.debug(`[WA-OTP] OTP untuk ${phoneClean}: ${otp}`);
            // Send via WhatsApp Queue
            await (0, whatsapp_notification_1.sendOtp)(phoneClean, otp);
            (0, utils_1.sendSuccess)(res, null, 'Kode OTP telah dikirim ke WhatsApp Anda. Berlaku 5 menit.');
        }
        catch (e) {
            next(e);
        }
    },
    async verifyOtp(req, res, next) {
        try {
            const { phone, otp } = req.body;
            if (!phone || !otp)
                throw new errors_1.BadRequestError('Nomor WhatsApp dan Kode OTP wajib diisi');
            const phoneClean = String(phone).replace(/[^0-9]/g, '');
            const storedOtp = await (0, redis_1.safeGet)(`OTP:${phoneClean}`);
            if (!storedOtp || storedOtp !== otp) {
                throw new errors_1.UnauthorizedError('Kode OTP salah atau sudah kadaluarsa');
            }
            // Valid! Delete OTP to prevent reuse
            await (0, redis_1.safeDel)(`OTP:${phoneClean}`);
            // Check if user exists, if not auto-register them
            let user = await db_1.default.queryOne("SELECT id, name FROM pelanggan WHERE phone = ?", [phoneClean]);
            if (!user) {
                // Auto register
                const insertId = await db_1.default.insert('pelanggan', {
                    name: `Pelanggan-${phoneClean.slice(-4)}`,
                    phone: phoneClean,
                    password: '', // Passwordless
                    type: 'kendaraan',
                    role: 'customer',
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                user = { id: insertId, name: `Pelanggan-${phoneClean.slice(-4)}` };
            }
            // Generate Tokens (same as password login)
            const token = jsonwebtoken_1.default.sign({ userId: user.id, isCustomer: true }, env_1.env.jwt.secret, { expiresIn: '15m' });
            const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id, isCustomer: true, isRefresh: true }, env_1.env.jwt.refreshSecret, { expiresIn: env_1.env.jwt.refreshExpiresIn });
            (0, utils_1.sendSuccess)(res, {
                token,
                refreshToken,
                user: { id: user.id, name: user.name, phone: phoneClean }
            }, 'Login berhasil');
        }
        catch (e) {
            next(e);
        }
    }
};
//# sourceMappingURL=pelanggan-otp.controller.js.map