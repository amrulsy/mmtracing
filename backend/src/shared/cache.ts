/**
 * Generic In-Memory Cache with TTL support.
 * Suitable for caching master data (Jasa, KategoriSparepart) and dashboard stats.
 * Auto-cleans expired entries every 60 seconds.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(cleanupIntervalMs: number = 60_000) {
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
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  /**
   * Set a value in cache with a TTL in milliseconds.
   */
  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Get cached value or compute it if not present.
   * Thread-safe for async operations (coalesces concurrent calls).
   */
  private pending = new Map<string, Promise<unknown>>();

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;

    // Coalesce concurrent requests for the same key
    const pendingPromise = this.pending.get(key);
    if (pendingPromise) return pendingPromise as Promise<T>;

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
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix.
   */
  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear entire cache.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Remove expired entries.
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  get size(): number {
    return this.store.size;
  }
}

// Singleton cache instance
export const appCache = new MemoryCache();

// Common TTL constants (milliseconds)
export const CACHE_TTL = {
  SHORT: 30_000,       // 30 seconds — dashboard, real-time stats
  MEDIUM: 2 * 60_000,  // 2 minutes — sparepart list
  LONG: 5 * 60_000,    // 5 minutes — master data (jasa, kategori)
  VERY_LONG: 30 * 60_000, // 30 minutes — rarely changing data
} as const;
