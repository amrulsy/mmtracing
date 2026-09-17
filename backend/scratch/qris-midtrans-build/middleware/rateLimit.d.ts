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
export declare function createRateLimiter(options?: RateLimitOptions): import("express-rate-limit").RateLimitRequestHandler;
export {};
