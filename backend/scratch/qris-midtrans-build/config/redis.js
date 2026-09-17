"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeDel = exports.safeGet = exports.safeSetex = exports.redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = __importDefault(require("./logger"));
// In-memory fallback
const fallbackMap = new Map();
exports.redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
        if (process.env.NODE_ENV !== 'production' && times > 3) {
            logger_1.default.warn('[REDIS] Gagal terhubung ke Redis. Berjalan dalam mode fallback (In-Memory).');
            return null; // Stop retrying
        }
        return Math.min(times * 50, 2000);
    }
});
exports.redis.on('error', (err) => {
    if (err.code === 'ECONNREFUSED') {
        // Suppressed
    }
    else {
        logger_1.default.error('[REDIS ERROR]', err.message);
    }
});
// Safe setex for OTP fallback
const safeSetex = async (key, seconds, value) => {
    if (exports.redis.status === 'ready') {
        return exports.redis.setex(key, seconds, value);
    }
    fallbackMap.set(key, { value, exp: Date.now() + seconds * 1000 });
    return 'OK';
};
exports.safeSetex = safeSetex;
// Safe get for OTP fallback
const safeGet = async (key) => {
    if (exports.redis.status === 'ready') {
        return exports.redis.get(key);
    }
    const item = fallbackMap.get(key);
    if (!item)
        return null;
    if (Date.now() > item.exp) {
        fallbackMap.delete(key);
        return null;
    }
    return item.value;
};
exports.safeGet = safeGet;
// Safe del
const safeDel = async (key) => {
    if (exports.redis.status === 'ready') {
        return exports.redis.del(key);
    }
    fallbackMap.delete(key);
    return 1;
};
exports.safeDel = safeDel;
//# sourceMappingURL=redis.js.map