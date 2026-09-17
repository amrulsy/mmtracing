"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePasswordSchema = exports.resetPasswordSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z.object({
    username: zod_1.z.string().min(1, 'Username wajib diisi'),
    password: zod_1.z.string().min(1, 'Password wajib diisi'),
});
exports.resetPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email tidak valid'),
});
exports.changePasswordSchema = zod_1.z.object({
    oldPassword: zod_1.z.string().min(1, 'Password lama wajib diisi'),
    newPassword: zod_1.z.string().min(6, 'Password baru minimal 6 karakter'),
});
//# sourceMappingURL=auth.schema.js.map