"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = exports.AuthController = void 0;
const auth_service_1 = require("./auth.service");
const utils_1 = require("../../shared/utils");
class AuthController {
    async login(req, res, next) {
        try {
            const result = await auth_service_1.authService.login(req.body);
            (0, utils_1.sendSuccess)(res, result, 'Login berhasil');
        }
        catch (e) {
            next(e);
        }
    }
    async refreshToken(req, res, next) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken)
                return res.status(400).json({ success: false, message: 'Refresh token wajib diisi' });
            const result = await auth_service_1.authService.refreshToken(refreshToken);
            (0, utils_1.sendSuccess)(res, result, 'Token berhasil diperbarui');
        }
        catch (e) {
            next(e);
        }
    }
    async me(req, res, next) {
        try {
            const profile = await auth_service_1.authService.getProfile(req.user.id);
            (0, utils_1.sendSuccess)(res, profile);
        }
        catch (e) {
            next(e);
        }
    }
    async changePassword(req, res, next) {
        try {
            await auth_service_1.authService.changePassword(req.user.id, req.body.oldPassword, req.body.newPassword);
            (0, utils_1.sendSuccess)(res, null, 'Password berhasil diubah');
        }
        catch (e) {
            next(e);
        }
    }
}
exports.AuthController = AuthController;
exports.authController = new AuthController();
//# sourceMappingURL=auth.controller.js.map