import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis';

interface RateLimitOptions {
  /** Time window in milliseconds (default: 10 minutes) */
  windowMs?: number;
  /** Max requests per window per IP (default: 5) */
  max?: number;
  /** Custom message on rate limit (default: Indonesian) */
  message?: string;
}

/**
 * Redis-backed rate limiter middleware factory.
 * Tracks requests per IP within a sliding window.
 * 
 * Usage: 
 *   const limiter = createRateLimiter({ windowMs: 10 * 60 * 1000, max: 5 });
 *   router.post('/booking', limiter, handler);
 */
export function createRateLimiter(options: RateLimitOptions = {}) {
  const {
    windowMs = 10 * 60 * 1000,  // 10 minutes
    max = 5,
    message = 'Terlalu banyak permintaan. Silakan coba lagi dalam beberapa menit.',
  } = options;

  const isProduction = process.env.NODE_ENV === 'production';
  const hasRedisUrl = !!process.env.REDIS_URL;

  const storeOptions = hasRedisUrl ? {
    store: new RedisStore({
      // @ts-expect-error - Known issue with rate-limit-redis and ioredis types
      sendCommand: (...args: string[]) => {
        if (redis.status !== 'ready') return Promise.resolve(); 
        // @ts-ignore
        return redis.call(...args);
      },
      prefix: 'rl:', // Prefix for Redis keys
    })
  } : {};

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    ...storeOptions,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        message,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });
}

