import { Router } from 'express';
import { pelangganAuthController } from './pelanggan-auth.controller';
import { pelangganOtpController } from './pelanggan-otp.controller';
import { customerAuthMiddleware } from '../../middleware/customerAuth';
import { createRateLimiter } from '../../middleware/rateLimit';

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

// OTP-based (Passwordless)
router.post('/request-otp', otpLimiter, pelangganOtpController.requestOtp);
router.post('/verify-otp', loginLimiter, pelangganOtpController.verifyOtp);

// Protected routes
router.get('/me', customerAuthMiddleware, pelangganAuthController.me);
router.get('/history', customerAuthMiddleware, pelangganAuthController.history);

export default router;
