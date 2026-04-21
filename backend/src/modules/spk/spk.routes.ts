import { Router } from 'express';
import { spkController } from './spk.controller';
import { authMiddleware } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createSpkSchema, updateSpkStatusSchema, addSpkItemSchema, updateSpkItemSchema, updateSpkStageSchema, addSpkStageSchema } from './spk.schema';

const router = Router();

router.use(authMiddleware);

// SPK CRUD
router.get('/', spkController.findAll);
router.get('/:id', spkController.findById);
router.post('/', validate(createSpkSchema), spkController.create);
router.put('/:id/status', validate(updateSpkStatusSchema), spkController.updateStatus);
router.put('/:id/progress', spkController.updateProgress);
router.delete('/:id', spkController.delete);

// Item Management (bisa dijalankan di status manapun kecuali selesai/dibatalkan)
router.post('/:id/items', validate(addSpkItemSchema), spkController.addItem);
router.patch('/:id/items/:itemId', validate(updateSpkItemSchema), spkController.updateItem);
router.delete('/:id/items/:itemId', spkController.removeItem);

// Stages Management
router.post('/:id/stages', validate(addSpkStageSchema), spkController.addStage);
router.patch('/:id/stages/:stageId', validate(updateSpkStageSchema), spkController.updateStage);

export default router;
