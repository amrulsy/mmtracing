import { Router } from 'express';
import { authController } from './auth.controller';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { loginSchema, changePasswordSchema } from './auth.schema';
import { createRateLimiter } from '../../middleware/rateLimit';

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 5, // max 5 percobaan
  message: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.',
});

const router = Router();

router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/refresh-token', authController.refreshToken);
router.get('/me', authMiddleware, authController.me);
router.put('/change-password', authMiddleware, validate(changePasswordSchema), authController.changePassword);

export default router;
