import { Router } from 'express';
import { pelangganAuthController } from './pelanggan-auth.controller';
import { pelangganOtpController } from './pelanggan-otp.controller';
import { customerAuthMiddleware } from '../../middleware/customerAuth';
import { createRateLimiter } from '../../middleware/rateLimit';
import { upload } from '../../middleware/upload';

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.',
});

const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: 'Terlalu banyak pendaftaran dari perangkat ini. Silakan coba lagi nanti.',
});

const otpLimiter = createRateLimiter({
  windowMs: 2 * 60 * 1000,
  max: 3,
  message: 'Terlalu sering meminta OTP. Silakan tunggu 2 menit.',
});

const router = Router();

// Password-based
router.post('/register', registerLimiter, pelangganAuthController.register);
router.post('/login', loginLimiter, pelangganAuthController.login);
router.post('/refresh-token', pelangganAuthController.refreshToken);
router.post('/logout', pelangganAuthController.logout);

// OTP-based (Passwordless)
router.post('/request-otp', otpLimiter, pelangganOtpController.requestOtp);
router.post('/verify-otp', loginLimiter, pelangganOtpController.verifyOtp);

// Protected routes
router.get('/me', customerAuthMiddleware, pelangganAuthController.me);
router.get('/dashboard', customerAuthMiddleware, pelangganAuthController.dashboard);
router.put('/profile', customerAuthMiddleware, pelangganAuthController.updateProfile);
router.post('/avatar', customerAuthMiddleware, upload.single('image'), pelangganAuthController.uploadAvatar);
router.get('/history', customerAuthMiddleware, pelangganAuthController.history);
router.get('/bookings', customerAuthMiddleware, pelangganAuthController.bookings);
router.post('/bookings/:id/cancel', customerAuthMiddleware, pelangganAuthController.cancelBooking);
router.post('/bookings/:id/reschedule', customerAuthMiddleware, pelangganAuthController.rescheduleBooking);
router.get('/spk/:id', customerAuthMiddleware, pelangganAuthController.spkDetail);
router.get('/wo/:id', customerAuthMiddleware, pelangganAuthController.spkDetail);
router.get('/work-order/:id', customerAuthMiddleware, pelangganAuthController.spkDetail);
router.post('/work-order/:id/estimate-approval', customerAuthMiddleware, pelangganAuthController.respondEstimateApproval);
router.get('/pembayaran', customerAuthMiddleware, pelangganAuthController.getPembayaran);

// Loyalty endpoints
router.get('/loyalty', customerAuthMiddleware, pelangganAuthController.getLoyalty);
router.get('/loyalty/history', customerAuthMiddleware, pelangganAuthController.getLoyaltyHistory);
router.get('/loyalty/rewards', customerAuthMiddleware, pelangganAuthController.getLoyaltyRewards);
router.post('/loyalty/redeem', customerAuthMiddleware, pelangganAuthController.redeemLoyalty);
router.get('/loyalty/vouchers', customerAuthMiddleware, pelangganAuthController.getVouchers);

// Garansi endpoints
router.get('/garansi', customerAuthMiddleware, pelangganAuthController.getGaransi);
router.post('/garansi/claim', customerAuthMiddleware, pelangganAuthController.claimGaransi);

// Notifikasi endpoints
router.get('/notifikasi', customerAuthMiddleware, pelangganAuthController.getNotifikasi);
router.put('/notifikasi/:id/read', customerAuthMiddleware, pelangganAuthController.markReadNotifikasi);
router.put('/notifikasi/read-all', customerAuthMiddleware, pelangganAuthController.markReadAllNotifikasi);

// Review endpoints
router.post('/review', customerAuthMiddleware, pelangganAuthController.submitReview);
router.get('/review/:woId', customerAuthMiddleware, pelangganAuthController.checkReview);

export default router;
