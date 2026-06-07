import db from '../config/db';
import { appCache, CACHE_TTL } from './cache';

const SETTING_PREFIX = 'setting:';

/**
 * Get setting value from cache, or fallback to database if not in cache.
 * Uses TTL-backed appCache (30 min TTL) — auto-expires so DB changes are picked up.
 */
export const getSetting = async (key: string): Promise<string | null> => {
  const cacheKey = SETTING_PREFIX + key;

  return appCache.getOrSet(cacheKey, async () => {
    const setting = await db.queryOne<{ value: string }>(
      'SELECT `value` FROM settings WHERE `key` = ?', [key]
    );
    return setting?.value ?? null;
  }, CACHE_TTL.VERY_LONG);
};

/**
 * Invalidate a specific setting key from the cache.
 */
export const invalidateSetting = (key: string) => {
  appCache.invalidate(SETTING_PREFIX + key);
};

/**
 * Clear all cached settings.
 */
export const invalidateAllSettings = () => {
  appCache.invalidatePrefix(SETTING_PREFIX);
};
