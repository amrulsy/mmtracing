"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerAuthMiddleware = customerAuthMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const errors_1 = require("../shared/errors");
const db_1 = __importDefault(require("../config/db"));
async function customerAuthMiddleware(req, _res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new errors_1.UnauthorizedError('Token tidak ditemukan');
        }
        const token = authHeader.split(' ')[1];
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.jwt.secret);
        if (!decoded.isCustomer) {
            throw new errors_1.UnauthorizedError('Akses ditolak: Hanya untuk Pelanggan');
        }
        const customer = await db_1.default.queryOne("SELECT id FROM pelanggan WHERE id = ?", [decoded.userId]);
        if (!customer) {
            throw new errors_1.UnauthorizedError('Akun pelanggan tidak ditemukan');
        }
        req.customerId = customer.id;
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
//# sourceMappingURL=customerAuth.js.map