import { Router } from 'express';
import { bundleController } from './bundle.controller';
import { authMiddleware, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createBundleSchema, updateBundleSchema } from './bundle.schema';

const router = Router();

router.use(authMiddleware);

// Public routes (require auth but any role)
router.get('/', bundleController.findAll);
router.get('/:id', bundleController.findById);

// Admin only routes
router.post('/', requireRole('Admin'), validate(createBundleSchema), bundleController.create);
router.put('/:id', requireRole('Admin'), validate(updateBundleSchema), bundleController.update);
router.delete('/:id', requireRole('Admin'), bundleController.delete);

export default router;
