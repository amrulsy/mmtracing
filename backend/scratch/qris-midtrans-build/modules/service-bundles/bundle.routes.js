"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bundle_controller_1 = require("./bundle.controller");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const bundle_schema_1 = require("./bundle.schema");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// Public routes (require auth but any role)
router.get('/', bundle_controller_1.bundleController.findAll);
router.get('/:id', bundle_controller_1.bundleController.findById);
// Admin only routes
router.post('/', (0, auth_1.requirePermission)('master', 'full'), (0, validate_1.validate)(bundle_schema_1.createBundleSchema), bundle_controller_1.bundleController.create);
router.put('/:id', (0, auth_1.requirePermission)('master', 'full'), (0, validate_1.validate)(bundle_schema_1.updateBundleSchema), bundle_controller_1.bundleController.update);
router.delete('/:id', (0, auth_1.requirePermission)('master', 'full'), bundle_controller_1.bundleController.delete);
exports.default = router;
//# sourceMappingURL=bundle.routes.js.map