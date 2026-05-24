import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  /** Time window in milliseconds (default: 10 minutes) */
  windowMs?: number;
  /** Max requests per window per IP (default: 5) */
  max?: number;
  /** Custom message on rate limit (default: Indonesian) */
  message?: string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * In-memory rate limiter middleware factory.
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

  const store = new Map<string, RateLimitEntry>();

  // Cleanup expired entries every minute
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }, 60_000);

  // Allow Node to exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let entry = store.get(ip);

    // If no entry or window expired, create new
    if (!entry || now > entry.resetAt) {
      entry = { count: 1, resetAt: now + windowMs };
      store.set(ip, entry);
      setRateLimitHeaders(res, max, max - 1, entry.resetAt);
      next();
      return;
    }

    // Increment count
    entry.count++;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      setRateLimitHeaders(res, max, 0, entry.resetAt);
      res.set('Retry-After', String(retryAfter));
      res.status(429).json({
        success: false,
        message,
        retryAfter,
      });
      return;
    }

    setRateLimitHeaders(res, max, max - entry.count, entry.resetAt);
    next();
  };
}

function setRateLimitHeaders(res: Response, limit: number, remaining: number, resetAt: number) {
  res.set('X-RateLimit-Limit', String(limit));
  res.set('X-RateLimit-Remaining', String(Math.max(0, remaining)));
  res.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
}
