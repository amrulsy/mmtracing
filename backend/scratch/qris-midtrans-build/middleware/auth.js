"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.requireRole = requireRole;
exports.requirePermission = requirePermission;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const errors_1 = require("../shared/errors");
const db_1 = __importDefault(require("../config/db"));
const cache_1 = require("../shared/cache");
const permissions_1 = require("../shared/permissions");
async function authMiddleware(req, _res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new errors_1.UnauthorizedError('Token tidak ditemukan');
        }
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.jwt.secret);
        if (decoded.isCustomer) {
            throw new errors_1.UnauthorizedError('Token pelanggan tidak dapat digunakan untuk akses staf');
        }
        const user = await cache_1.appCache.getOrSet(`auth_user_${decoded.userId}`, async () => {
            return await db_1.default.queryOne(`SELECT u.id, u.name, u.username, u.email, u.roleId, u.status,
                r.name AS roleName, r.permissions, r.isProtected
         FROM users u
         JOIN roles r ON r.id = u.roleId
         WHERE u.id = ?`, [decoded.userId]);
        }, cache_1.CACHE_TTL.LONG);
        if (!user || user.status !== 'aktif') {
            throw new errors_1.UnauthorizedError('User tidak aktif atau tidak ditemukan');
        }
        let perms = {};
        if (user.permissions) {
            try {
                const raw = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
                if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
                    perms = raw;
                }
            }
            catch (e) {
                // Fallback to empty object if JSON parsing fails
            }
        }
        req.user = {
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            roleId: user.roleId,
            roleName: user.roleName,
            permissions: perms,
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            next(new errors_1.UnauthorizedError('Token tidak valid'));
        }
        else if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            next(new errors_1.UnauthorizedError('Token sudah expired'));
        }
        else {
            next(error);
        }
    }
}
/**
 * @deprecated Use requirePermission() instead. Kept only for backward compatibility.
 */
function requireRole(...roles) {
    return (req, _res, next) => {
        if (!req.user) {
            return next(new errors_1.UnauthorizedError());
        }
        // Admin bypass as superuser
        if (req.user.roleName === 'Admin') {
            return next();
        }
        if (!roles.includes(req.user.roleName)) {
            return next(new errors_1.UnauthorizedError('Tidak memiliki akses untuk role ini'));
        }
        next();
    };
}
function requirePermission(moduleName, minLevel = 'view') {
    return (req, _res, next) => {
        if (!req.user) {
            return next(new errors_1.UnauthorizedError());
        }
        // Admin bypass — role named "Admin" always has full access
        if (req.user.roleName === 'Admin') {
            return next();
        }
        const userLevelStr = req.user.permissions?.[moduleName] || 'none';
        const userLevel = permissions_1.PERMISSION_LEVELS[userLevelStr] || 0;
        const requiredLevel = permissions_1.PERMISSION_LEVELS[minLevel] || 0;
        if (userLevel >= requiredLevel) {
            return next();
        }
        return next(new errors_1.UnauthorizedError(`Akses ditolak: Membutuhkan izin '${minLevel}' pada modul '${moduleName}'`));
    };
}
//# sourceMappingURL=auth.js.map