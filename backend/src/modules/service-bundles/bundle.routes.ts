import { Router } from 'express';
import { bundleController } from './bundle.controller';
import { authMiddleware, requireRole, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createBundleSchema, updateBundleSchema } from './bundle.schema';

const router = Router();

router.use(authMiddleware);

// Public routes (require auth but any role)
router.get('/', bundleController.findAll);
router.get('/:id', bundleController.findById);

// Admin only routes
router.post('/', requirePermission('master', 'full'), validate(createBundleSchema), bundleController.create);
router.put('/:id', requirePermission('master', 'full'), validate(updateBundleSchema), bundleController.update);
router.delete('/:id', requirePermission('master', 'full'), bundleController.delete);

export default router;
