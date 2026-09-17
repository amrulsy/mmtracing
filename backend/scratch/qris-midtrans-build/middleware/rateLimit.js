"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = createRateLimiter;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const rate_limit_redis_1 = __importDefault(require("rate-limit-redis"));
const redis_1 = require("../config/redis");
/**
 * Redis-backed rate limiter middleware factory.
 * Tracks requests per IP within a sliding window.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 5 });
 *   router.post('/booking', limiter, handler);
 */
function createRateLimiter(options = {}) {
    const { windowMs = 10 * 60 * 1000, // 10 minutes
    max = 5, message = 'Terlalu banyak permintaan. Silakan coba lagi dalam beberapa menit.', } = options;
    const isProduction = process.env.NODE_ENV === 'production';
    const hasRedisUrl = !!process.env.REDIS_URL;
    const storeOptions = hasRedisUrl ? {
        store: new rate_limit_redis_1.default({
            // @ts-expect-error - Known issue with rate-limit-redis and ioredis types
            sendCommand: (...args) => {
                if (redis_1.redis.status !== 'ready')
                    return Promise.resolve();
                // @ts-ignore
                return redis_1.redis.call(...args);
            },
            prefix: 'rl:', // Prefix for Redis keys
        })
    } : {};
    return (0, express_rate_limit_1.default)({
        windowMs,
        max,
        standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
        legacyHeaders: false, // Disable the `X-RateLimit-*` headers
        ...storeOptions,
        handler: (req, res) => {
            res.status(429).json({
                success: false,
                message,
                retryAfter: Math.ceil(windowMs / 1000),
            });
        },
    });
}
//# sourceMappingURL=rateLimit.js.map