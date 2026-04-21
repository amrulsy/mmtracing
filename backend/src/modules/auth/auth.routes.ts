import { Router } from 'express';
import { authController } from './auth.controller';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { loginSchema, changePasswordSchema } from './auth.schema';

const router = Router();

router.post('/login', validate(loginSchema), authController.login);
router.get('/me', authMiddleware, authController.me);
router.put('/change-password', authMiddleware, validate(changePasswordSchema), authController.changePassword);

export default router;
