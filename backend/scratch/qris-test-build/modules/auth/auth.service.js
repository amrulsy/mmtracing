"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../../config/db"));
const env_1 = require("../../config/env");
const errors_1 = require("../../shared/errors");
class AuthService {
    async login(input) {
        const user = await db_1.default.queryOne(`SELECT u.*, r.name AS roleName, r.permissions AS rolePermissions
       FROM users u JOIN roles r ON r.id = u.roleId
       WHERE u.username = ? OR u.email = ? LIMIT 1`, [input.username, input.username]);
        if (!user)
            throw new errors_1.UnauthorizedError('Username atau password salah');
        if (user.status !== 'aktif')
            throw new errors_1.UnauthorizedError('Akun tidak aktif');
        const validPassword = await bcryptjs_1.default.compare(input.password, user.password);
        if (!validPassword)
            throw new errors_1.UnauthorizedError('Username atau password salah');
        // Update last login
        await db_1.default.update('users', { lastLogin: new Date() }, 'id = ?', [user.id]);
        // Log activity
        await db_1.default.insert('activity_logs', {
            userId: user.id,
            action: 'login',
            module: 'auth',
            targetName: user.name,
        });
        // Access token — short-lived, signed with primary secret
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, env_1.env.jwt.secret, {
            expiresIn: env_1.env.jwt.expiresIn,
        });
        // Refresh token — long-lived, signed with SEPARATE secret
        const refreshToken = jsonwebtoken_1.default.sign({ userId: user.id, isRefresh: true }, env_1.env.jwt.refreshSecret, {
            expiresIn: env_1.env.jwt.refreshExpiresIn,
        });
        // Parse permissions from role
        let permissions = {};
        if (user.rolePermissions) {
            try {
                const raw = typeof user.rolePermissions === 'string' ? JSON.parse(user.rolePermissions) : user.rolePermissions;
                if (typeof raw === 'object' && raw !== null && !Array.isArray(raw))
                    permissions = raw;
            }
            catch (_e) { /* ignore parse errors */ }
        }
        return {
            token,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                roleId: user.roleId,
                roleName: user.roleName,
                permissions,
                avatar: user.avatar,
            },
        };
    }
    async refreshToken(token) {
        try {
            // Verify with REFRESH secret (separate from access token secret)
            const decoded = jsonwebtoken_1.default.verify(token, env_1.env.jwt.refreshSecret);
            if (!decoded.isRefresh)
                throw new errors_1.UnauthorizedError('Token tidak valid untuk refresh');
            const user = await db_1.default.queryOne('SELECT id, status FROM users WHERE id = ?', [decoded.userId]);
            if (!user)
                throw new errors_1.UnauthorizedError('User tidak ditemukan');
            if (user.status !== 'aktif')
                throw new errors_1.UnauthorizedError('Akun tidak aktif');
            // Issue new access token (primary secret)
            const newToken = jsonwebtoken_1.default.sign({ userId: user.id }, env_1.env.jwt.secret, {
                expiresIn: env_1.env.jwt.expiresIn,
            });
            // Issue new refresh token (refresh secret) — token rotation
            const newRefreshToken = jsonwebtoken_1.default.sign({ userId: user.id, isRefresh: true }, env_1.env.jwt.refreshSecret, {
                expiresIn: env_1.env.jwt.refreshExpiresIn,
            });
            return { token: newToken, refreshToken: newRefreshToken };
        }
        catch (e) {
            if (e instanceof errors_1.UnauthorizedError)
                throw e;
            throw new errors_1.UnauthorizedError('Refresh token tidak valid atau sudah kedaluwarsa');
        }
    }
    async getProfile(userId) {
        const user = await db_1.default.queryOne(`SELECT u.id, u.name, u.username, u.email, u.avatar, u.lastLogin,
              u.roleId, r.name AS roleName, r.permissions AS rolePermissions
       FROM users u JOIN roles r ON r.id = u.roleId
       WHERE u.id = ?`, [userId]);
        if (!user)
            throw new errors_1.NotFoundError('User');
        // Parse permissions
        let permissions = {};
        if (user.rolePermissions) {
            try {
                const raw = typeof user.rolePermissions === 'string' ? JSON.parse(user.rolePermissions) : user.rolePermissions;
                if (typeof raw === 'object' && raw !== null && !Array.isArray(raw))
                    permissions = raw;
            }
            catch (_e) { /* ignore parse errors */ }
        }
        return {
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            roleId: user.roleId,
            roleName: user.roleName,
            permissions,
            avatar: user.avatar,
            lastLogin: user.lastLogin,
        };
    }
    async changePassword(userId, oldPassword, newPassword) {
        const user = await db_1.default.queryOne('SELECT id, password FROM users WHERE id = ?', [userId]);
        if (!user)
            throw new errors_1.NotFoundError('User');
        const valid = await bcryptjs_1.default.compare(oldPassword, user.password);
        if (!valid)
            throw new errors_1.UnauthorizedError('Password lama salah');
        const hashed = await bcryptjs_1.default.hash(newPassword, 12);
        await db_1.default.update('users', { password: hashed }, 'id = ?', [userId]);
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
//# sourceMappingURL=auth.service.js.map