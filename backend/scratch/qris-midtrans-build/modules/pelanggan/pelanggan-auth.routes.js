"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pelanggan_auth_controller_1 = require("./pelanggan-auth.controller");
const pelanggan_otp_controller_1 = require("./pelanggan-otp.controller");
const customerAuth_1 = require("../../middleware/customerAuth");
const rateLimit_1 = require("../../middleware/rateLimit");
const upload_1 = require("../../middleware/upload");
const loginLimiter = (0, rateLimit_1.createRateLimiter)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.',
});
const registerLimiter = (0, rateLimit_1.createRateLimiter)({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: 'Terlalu banyak pendaftaran dari perangkat ini. Silakan coba lagi nanti.',
});
const otpLimiter = (0, rateLimit_1.createRateLimiter)({
    windowMs: 2 * 60 * 1000,
    max: 3,
    message: 'Terlalu sering meminta OTP. Silakan tunggu 2 menit.',
});
const router = (0, express_1.Router)();
// Password-based
router.post('/register', registerLimiter, pelanggan_auth_controller_1.pelangganAuthController.register);
router.post('/login', loginLimiter, pelanggan_auth_controller_1.pelangganAuthController.login);
router.post('/refresh-token', pelanggan_auth_controller_1.pelangganAuthController.refreshToken);
// OTP-based (Passwordless)
router.post('/request-otp', otpLimiter, pelanggan_otp_controller_1.pelangganOtpController.requestOtp);
router.post('/verify-otp', loginLimiter, pelanggan_otp_controller_1.pelangganOtpController.verifyOtp);
// Protected routes
router.get('/me', customerAuth_1.customerAuthMiddleware, pelanggan_auth_controller_1.pelangganAuthController.me);
router.put('/profile', customerAuth_1.customerAuthMiddleware, pelanggan_auth_controller_1.pelangganAuthController.updateProfile);
router.post('/avatar', customerAuth_1.customerAuthMiddleware, upload_1.upload.single('image'), pelanggan_auth_controller_1.pelangganAuthController.uploadAvatar);
router.get('/history', customerAuth_1.customerAuthMiddleware, pelanggan_auth_controller_1.pelangganAuthController.history);
router.get('/spk/:id', customerAuth_1.customerAuthMiddleware, pelanggan_auth_controller_1.pelangganAuthController.spkDetail);
router.get('/wo/:id', customerAuth_1.customerAuthMiddleware, pelanggan_auth_controller_1.pelangganAuthController.spkDetail);
router.get('/work-order/:id', customerAuth_1.customerAuthMiddleware, pelanggan_auth_controller_1.pelangganAuthController.spkDetail);
router.get('/pembayaran', customerAuth_1.customerAuthMiddleware, pelanggan_auth_controller_1.pelangganAuthController.getPembayaran);
// Loyalty endpoints
router.get('/loyalty', customerAuth_1.customerAuthMiddleware, pelanggan_auth_controller_1.pelangganAuthController.getLoyalty);
router.get('/loyalty/history', customerAuth_1.customerAuthMiddleware, pelanggan_auth_controller_1.pelangganAuthController.getLoyaltyHistory);
router.get('/loyalty/rewards', customerAuth_1.customerAuthMiddleware, pelanggan_auth_controller_1.pelangganAuthController.getLoyaltyRewards);
router.post('/loyalty/redeem', customerAuth_1.customerAuthMiddleware, pelanggan_auth_controller_1.pelangganAuthController.redeemLoyalty);
// Garansi endpoints
router.get('/garansi', customerAuth_1.customerAuthMiddleware, pelanggan_auth_controller_1.pelangganAuthController.getGaransi);
router.post('/garansi/claim', customerAuth_1.customerAuthMiddleware, pelanggan_auth_controller_1.pelangganAuthController.claimGaransi);
// Notifikasi endpoints
router.get('/notifikasi', customerAuth_1.customerAuthMiddleware, pelanggan_auth_controller_1.pelangganAuthController.getNotifikasi);
router.put('/notifikasi/read-all', customerAuth_1.customerAuthMiddleware, pelanggan_auth_controller_1.pelangganAuthController.markReadAllNotifikasi);
// Review endpoints
router.post('/review', customerAuth_1.customerAuthMiddleware, pelanggan_auth_controller_1.pelangganAuthController.submitReview);
router.get('/review/:woId', customerAuth_1.customerAuthMiddleware, pelanggan_auth_controller_1.pelangganAuthController.checkReview);
exports.default = router;
//# sourceMappingURL=pelanggan-auth.routes.js.map