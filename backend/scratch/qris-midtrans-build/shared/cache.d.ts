/**
 * Generic In-Memory Cache with TTL support.
 * Suitable for caching master data (Jasa, KategoriSparepart) and dashboard stats.
 * Auto-cleans expired entries every 60 seconds.
 */
declare class MemoryCache {
    private store;
    private cleanupInterval;
    constructor(cleanupIntervalMs?: number);
    /**
     * Get a cached value by key. Returns undefined if not found or expired.
     */
    get<T>(key: string): T | undefined;
    /**
     * Set a value in cache with a TTL in milliseconds.
     */
    set<T>(key: string, value: T, ttlMs: number): void;
    /**
     * Get cached value or compute it if not present.
     * Thread-safe for async operations (coalesces concurrent calls).
     */
    private pending;
    getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs: number): Promise<T>;
    /**
     * Invalidate a specific key.
     */
    invalidate(key: string): void;
    /**
     * Invalidate all keys matching a prefix.
     */
    invalidatePrefix(prefix: string): void;
    /**
     * Clear entire cache.
     */
    clear(): void;
    /**
     * Remove expired entries.
     */
    private cleanup;
    get size(): number;
}
export declare const appCache: MemoryCache;
export declare const CACHE_TTL: {
    readonly SHORT: 30000;
    readonly MEDIUM: number;
    readonly LONG: number;
    readonly VERY_LONG: number;
};
export {};
