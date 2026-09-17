/**
 * Get setting value from cache, or fallback to database if not in cache.
 * Uses TTL-backed appCache (30 min TTL) — auto-expires so DB changes are picked up.
 */
export declare const getSetting: (key: string) => Promise<string | null>;
/**
 * Invalidate a specific setting key from the cache.
 */
export declare const invalidateSetting: (key: string) => void;
/**
 * Clear all cached settings.
 */
export declare const invalidateAllSettings: () => void;
