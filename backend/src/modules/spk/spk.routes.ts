import { Router } from 'express';
import { spkController } from './spk.controller';
import { authMiddleware, requireRole } from '../../middleware/auth';
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
router.post('/', validate(createSpkSchema), spkController.create);
router.put('/:id', validate(updateSpkSchema), spkController.update);
router.put('/:id/status', validate(updateSpkStatusSchema), spkController.updateStatus);
router.put('/:id/progress', spkController.updateProgress);
router.put('/:id/mekanik', validate(assignMekanikSchema), spkController.assignMekanik);
router.post('/:id/whatsapp', spkController.sendWhatsapp);
router.post('/:id/restore', requireRole('Admin'), spkController.restore);
router.delete('/:id', requireRole('Admin'), spkController.delete);

// Item Management (bisa dijalankan di status manapun kecuali selesai/dibatalkan)
router.post('/:id/items', validate(addSpkItemSchema), spkController.addItem);
router.patch('/:id/items/:itemId', validate(updateSpkItemSchema), spkController.updateItem);
router.delete('/:id/items/:itemId', spkController.removeItem);

// Stages Management
router.post('/:id/stages', validate(addSpkStageSchema), spkController.addStage);
router.patch('/:id/stages/:stageId', validate(updateSpkStageSchema), spkController.updateStage);

// Foto / Gambar SPK
router.post('/:id/photos', upload.single('photo'), spkController.uploadPhoto);

export default router;
