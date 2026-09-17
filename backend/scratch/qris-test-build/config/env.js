"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const crypto_1 = __importDefault(require("crypto"));
dotenv_1.default.config();
// Enforce JWT_SECRET in production — never fall back to a known default
function resolveJwtSecret() {
    if (process.env.JWT_SECRET)
        return process.env.JWT_SECRET;
    if (process.env.NODE_ENV === 'production') {
        throw new Error('FATAL: JWT_SECRET environment variable is required in production');
    }
    // Dev-only: generate a random secret per process (safe for local dev)
    const devSecret = 'dev-only-' + crypto_1.default.randomBytes(16).toString('hex');
    console.warn('[⚠ WARNING] Using random dev JWT_SECRET. Set JWT_SECRET in .env for persistent sessions.');
    return devSecret;
}
function resolveRefreshSecret() {
    if (process.env.JWT_REFRESH_SECRET)
        return process.env.JWT_REFRESH_SECRET;
    if (process.env.NODE_ENV === 'production') {
        throw new Error('FATAL: JWT_REFRESH_SECRET environment variable is required in production');
    }
    const devSecret = 'dev-refresh-' + crypto_1.default.randomBytes(16).toString('hex');
    return devSecret;
}
exports.env = {
    port: parseInt(process.env.PORT || '5000'),
    nodeEnv: process.env.NODE_ENV || 'development',
    appUrl: process.env.APP_URL || 'http://localhost:5000',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    jwt: {
        secret: resolveJwtSecret(),
        refreshSecret: resolveRefreshSecret(),
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    },
    upload: {
        dir: process.env.UPLOAD_DIR || './uploads',
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
    },
    wa: {
        sessionPath: process.env.WA_SESSION_PATH || './wa-sessions',
    },
};
//# sourceMappingURL=env.js.map