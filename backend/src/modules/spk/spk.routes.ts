import { Router } from 'express';
import { spkController } from './spk.controller';
import { authMiddleware, requireRole, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createSpkSchema, updateSpkStatusSchema, updateSpkSchema, assignMekanikSchema, addSpkItemSchema, updateSpkItemSchema, updateSpkStageSchema, addSpkStageSchema } from './spk.schema';
import { upload } from '../../middleware/upload';

const router = Router();

router.use(authMiddleware);

// SPK CRUD
router.get('/stats', spkController.stats);
router.get('/analytics', spkController.analytics);
router.get('/', spkController.findAll);
router.get('/:id', spkController.findById);
router.post('/', requirePermission('spk', 'edit'), validate(createSpkSchema), spkController.create);
router.put('/:id', requirePermission('spk', 'edit'), validate(updateSpkSchema), spkController.update);
router.put('/:id/status', requirePermission('spk', 'edit'), validate(updateSpkStatusSchema), spkController.updateStatus);
router.put('/:id/progress', requirePermission('spk', 'edit'), spkController.updateProgress);
router.put('/:id/mekanik', requirePermission('spk', 'edit'), validate(assignMekanikSchema), spkController.assignMekanik);
router.post('/:id/whatsapp', requirePermission('spk', 'view'), spkController.sendWhatsapp);
router.post('/:id/restore', requirePermission('spk', 'full'), spkController.restore);
router.delete('/:id', requirePermission('spk', 'full'), spkController.delete);

// Item Management (bisa dijalankan di status manapun kecuali selesai/dibatalkan)
router.post('/:id/items', requirePermission('spk', 'edit'), validate(addSpkItemSchema), spkController.addItem);
router.patch('/:id/items/:itemId', requirePermission('spk', 'edit'), validate(updateSpkItemSchema), spkController.updateItem);
router.delete('/:id/items/:itemId', requirePermission('spk', 'edit'), spkController.removeItem);

// Stages Management
router.post('/:id/stages', requirePermission('spk', 'edit'), validate(addSpkStageSchema), spkController.addStage);
router.patch('/:id/stages/:stageId', requirePermission('spk', 'edit'), validate(updateSpkStageSchema), spkController.updateStage);

// Foto / Gambar SPK
router.post('/:id/photos', requirePermission('spk', 'edit'), upload.single('photo'), spkController.uploadPhoto);

export default router;
