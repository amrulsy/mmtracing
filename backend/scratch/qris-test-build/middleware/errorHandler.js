"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const errors_1 = require("../shared/errors");
const logger_1 = __importDefault(require("../config/logger"));
/** Modules where errors are considered critical (data integrity risk) */
const CRITICAL_MODULES = ['inventaris', 'pembayaran', 'spk', 'stok', 'transaksi'];
function isCriticalPath(path) {
    return CRITICAL_MODULES.some(m => path.includes(m));
}
function errorHandler(err, req, res, _next) {
    const context = {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userId: req.user?.id || null,
    };
    if (err instanceof errors_1.AppError) {
        logger_1.default.warn(`[${err.statusCode}] ${err.message}`, context);
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
        return;
    }
    // MySQL errors
    if (err.code === 'ER_DUP_ENTRY') {
        res.status(409).json({
            success: false,
            message: 'Data dengan nilai tersebut sudah ada (duplikat)',
        });
        return;
    }
    if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2') {
        res.status(409).json({
            success: false,
            message: 'Data terkait dengan entitas lain, tidak dapat diproses',
        });
        return;
    }
    // Multer errors
    if (err.name === 'MulterError') {
        res.status(400).json({
            success: false,
            message: `Upload error: ${err.message}`,
        });
        return;
    }
    // Classify severity: critical for data-integrity modules
    if (isCriticalPath(req.path)) {
        logger_1.default.crit(`[CRITICAL] Unhandled error on ${req.method} ${req.path}: ${err.message}`, {
            ...context,
            stack: err.stack,
            errorName: err.name,
        });
    }
    else {
        logger_1.default.error('Unhandled error:', { ...context, stack: err.stack, errorName: err.name });
    }
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'development' ? err.message : 'Terjadi kesalahan server',
    });
}
//# sourceMappingURL=errorHandler.js.map