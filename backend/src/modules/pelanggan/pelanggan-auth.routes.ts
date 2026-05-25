import { Router } from 'express';
import { pelangganAuthController } from './pelanggan-auth.controller';
import { customerAuthMiddleware } from '../../middleware/customerAuth';

const router = Router();

router.post('/register', pelangganAuthController.register);
router.post('/login', pelangganAuthController.login);
router.get('/me', customerAuthMiddleware, pelangganAuthController.me);
router.get('/history', customerAuthMiddleware, pelangganAuthController.history);

export default router;
