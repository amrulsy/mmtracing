"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const wo_controller_1 = require("./wo.controller");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const wo_schema_1 = require("./wo.schema");
const upload_1 = require("../../middleware/upload");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// Work Order CRUD
router.get('/stats', wo_controller_1.woController.stats);
router.get('/analytics', wo_controller_1.woController.analytics);
router.get('/', wo_controller_1.woController.findAll);
router.get('/:id', wo_controller_1.woController.findById);
router.post('/', (0, auth_1.requirePermission)('wo', 'edit'), (0, validate_1.validate)(wo_schema_1.createWoSchema), wo_controller_1.woController.create);
router.put('/:id', (0, auth_1.requirePermission)('wo', 'edit'), (0, validate_1.validate)(wo_schema_1.updateWoSchema), wo_controller_1.woController.update);
router.put('/:id/status', (0, auth_1.requirePermission)('wo', 'edit'), (0, validate_1.validate)(wo_schema_1.updateWoStatusSchema), wo_controller_1.woController.updateStatus);
router.put('/:id/progress', (0, auth_1.requirePermission)('wo', 'edit'), wo_controller_1.woController.updateProgress);
router.put('/:id/mekanik', (0, auth_1.requirePermission)('wo', 'edit'), (0, validate_1.validate)(wo_schema_1.assignMekanikSchema), wo_controller_1.woController.assignMekanik);
router.post('/:id/whatsapp', (0, auth_1.requirePermission)('wo', 'view'), wo_controller_1.woController.sendWhatsapp);
router.post('/:id/restore', (0, auth_1.requirePermission)('wo', 'full'), wo_controller_1.woController.restore);
router.delete('/:id', (0, auth_1.requirePermission)('wo', 'full'), wo_controller_1.woController.delete);
// Item Management (bisa dijalankan di status manapun kecuali selesai/dibatalkan)
router.post('/:id/items', (0, auth_1.requirePermission)('wo', 'edit'), (0, validate_1.validate)(wo_schema_1.addWoItemSchema), wo_controller_1.woController.addItem);
router.patch('/:id/items/:itemId', (0, auth_1.requirePermission)('wo', 'edit'), (0, validate_1.validate)(wo_schema_1.updateWoItemSchema), wo_controller_1.woController.updateItem);
router.delete('/:id/items/:itemId', (0, auth_1.requirePermission)('wo', 'edit'), wo_controller_1.woController.removeItem);
// Stages Management
router.post('/:id/stages', (0, auth_1.requirePermission)('wo', 'edit'), (0, validate_1.validate)(wo_schema_1.addWoStageSchema), wo_controller_1.woController.addStage);
router.patch('/:id/stages/:stageId', (0, auth_1.requirePermission)('wo', 'edit'), (0, validate_1.validate)(wo_schema_1.updateWoStageSchema), wo_controller_1.woController.updateStage);
// Foto / Gambar Work Order
router.post('/:id/photos', (0, auth_1.requirePermission)('wo', 'edit'), upload_1.upload.single('photo'), wo_controller_1.woController.uploadPhoto);
exports.default = router;
//# sourceMappingURL=wo.routes.js.map