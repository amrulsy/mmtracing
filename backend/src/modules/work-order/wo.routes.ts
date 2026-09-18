import { Router } from 'express';
import { woController } from './wo.controller';
import { authMiddleware, requireRole, requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createWoSchema, updateWoStatusSchema, updateWoSchema, assignMekanikSchema, addWoItemSchema, updateWoItemSchema, updateWoStageSchema, addWoStageSchema } from './wo.schema';
import { upload } from '../../middleware/upload';
import db from '../../config/db';
import { sendSuccess } from '../../shared/utils';
import { ensureEstimateApprovalSchema } from './estimate-approval';
import { notifyEstimateApprovalRequested } from '../whatsapp/whatsapp.notification';

const router = Router();

router.use(authMiddleware);

// Work Order CRUD
router.get('/stats', woController.stats);
router.get('/analytics', woController.analytics);
router.get('/', woController.findAll);
router.get('/:id', woController.findById);
router.post('/', requirePermission('wo', 'edit'), validate(createWoSchema), woController.create);
router.put('/:id', requirePermission('wo', 'edit'), validate(updateWoSchema), woController.update);
router.put('/:id/status', requirePermission('wo', 'edit'), validate(updateWoStatusSchema), woController.updateStatus);
router.put('/:id/progress', requirePermission('wo', 'edit'), woController.updateProgress);
router.put('/:id/mekanik', requirePermission('wo', 'edit'), validate(assignMekanikSchema), woController.assignMekanik);
router.post('/:id/whatsapp', requirePermission('wo', 'view'), woController.sendWhatsapp);
// Request a customer's approval after an estimate or additional work changes.
router.post('/:id/estimate-approval/request', requirePermission('wo', 'edit'), async (req, res, next) => {
  try {
    await ensureEstimateApprovalSchema();
    const id = Number(req.params.id);
    const { note } = req.body as { note?: string };
    const wo = await db.queryOne<{ id: number; totalHarga: number }>('SELECT id, totalHarga FROM work_orders WHERE id = ? AND deletedAt IS NULL', [id]);
    if (!wo) return res.status(404).json({ success: false, message: 'Work Order tidak ditemukan' });
    if (Number(wo.totalHarga) <= 0) return res.status(400).json({ success: false, message: 'Masukkan item atau tahap serta estimasi biaya terlebih dahulu.' });
    await db.update('work_orders', { estimateApprovalStatus: 'pending', estimateApprovalNote: note?.trim() || null, estimateApprovedAt: null, updatedAt: new Date() }, 'id = ?', [id]);
    notifyEstimateApprovalRequested(id).catch(() => {});
    sendSuccess(res, null, 'Permintaan persetujuan estimasi telah dikirim ke portal pelanggan');
  } catch (error) { next(error); }
});
router.post('/:id/restore', requirePermission('wo', 'full'), woController.restore);
router.delete('/:id', requirePermission('wo', 'full'), woController.delete);

// Item Management (bisa dijalankan di status manapun kecuali selesai/dibatalkan)
router.post('/:id/items', requirePermission('wo', 'edit'), validate(addWoItemSchema), woController.addItem);
router.patch('/:id/items/:itemId', requirePermission('wo', 'edit'), validate(updateWoItemSchema), woController.updateItem);
router.delete('/:id/items/:itemId', requirePermission('wo', 'edit'), woController.removeItem);

// Stages Management
router.post('/:id/stages', requirePermission('wo', 'edit'), validate(addWoStageSchema), woController.addStage);
router.patch('/:id/stages/:stageId', requirePermission('wo', 'edit'), validate(updateWoStageSchema), woController.updateStage);

// Foto / Gambar Work Order
router.post('/:id/photos', requirePermission('wo', 'edit'), upload.single('photo'), woController.uploadPhoto);

export default router;
