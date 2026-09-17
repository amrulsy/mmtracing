"use strict";
/**
 * Generic In-Memory Cache with TTL support.
 * Suitable for caching master data (Jasa, KategoriSparepart) and dashboard stats.
 * Auto-cleans expired entries every 60 seconds.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CACHE_TTL = exports.appCache = void 0;
class MemoryCache {
    constructor(cleanupIntervalMs = 60000) {
        this.store = new Map();
        /**
         * Get cached value or compute it if not present.
         * Thread-safe for async operations (coalesces concurrent calls).
         */
        this.pending = new Map();
        // Periodically remove expired entries
        this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
        // Allow Node to exit even if interval is still running
        if (this.cleanupInterval.unref) {
            this.cleanupInterval.unref();
        }
    }
    /**
     * Get a cached value by key. Returns undefined if not found or expired.
     */
    get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return undefined;
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            return undefined;
        }
        return entry.value;
    }
    /**
     * Set a value in cache with a TTL in milliseconds.
     */
    set(key, value, ttlMs) {
        this.store.set(key, {
            value,
            expiresAt: Date.now() + ttlMs,
        });
    }
    async getOrSet(key, factory, ttlMs) {
        const cached = this.get(key);
        if (cached !== undefined)
            return cached;
        // Coalesce concurrent requests for the same key
        const pendingPromise = this.pending.get(key);
        if (pendingPromise)
            return pendingPromise;
        const promise = factory().then((value) => {
            this.set(key, value, ttlMs);
            this.pending.delete(key);
            return value;
        }).catch((err) => {
            this.pending.delete(key);
            throw err;
        });
        this.pending.set(key, promise);
        return promise;
    }
    /**
     * Invalidate a specific key.
     */
    invalidate(key) {
        this.store.delete(key);
    }
    /**
     * Invalidate all keys matching a prefix.
     */
    invalidatePrefix(prefix) {
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) {
                this.store.delete(key);
            }
        }
    }
    /**
     * Clear entire cache.
     */
    clear() {
        this.store.clear();
    }
    /**
     * Remove expired entries.
     */
    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (now > entry.expiresAt) {
                this.store.delete(key);
            }
        }
    }
    get size() {
        return this.store.size;
    }
}
// Singleton cache instance
exports.appCache = new MemoryCache();
// Common TTL constants (milliseconds)
exports.CACHE_TTL = {
    SHORT: 30000, // 30 seconds — dashboard, real-time stats
    MEDIUM: 2 * 60000, // 2 minutes — sparepart list
    LONG: 5 * 60000, // 5 minutes — master data (jasa, kategori)
    VERY_LONG: 30 * 60000, // 30 minutes — rarely changing data
};
//# sourceMappingURL=cache.js.map