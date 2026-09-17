"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const auth_schema_1 = require("./auth.schema");
const rateLimit_1 = require("../../middleware/rateLimit");
const loginLimiter = (0, rateLimit_1.createRateLimiter)({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 5, // max 5 percobaan
    message: 'Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.',
});
const router = (0, express_1.Router)();
router.post('/login', loginLimiter, (0, validate_1.validate)(auth_schema_1.loginSchema), auth_controller_1.authController.login);
router.post('/refresh-token', auth_controller_1.authController.refreshToken);
router.get('/me', auth_1.authMiddleware, auth_controller_1.authController.me);
router.put('/change-password', auth_1.authMiddleware, (0, validate_1.validate)(auth_schema_1.changePasswordSchema), auth_controller_1.authController.changePassword);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map