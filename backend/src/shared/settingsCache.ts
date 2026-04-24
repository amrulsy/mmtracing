import prisma from '../config/database';

// In-memory cache map for application settings
const settingsCache = new Map<string, string>();

/**
 * Get setting value from cache, or fallback to database if not in cache.
 */
export const getSetting = async (key: string): Promise<string | null> => {
  if (settingsCache.has(key)) {
    return settingsCache.get(key) || null;
  }

  const setting = await prisma.setting.findUnique({
    where: { key }
  });

  if (setting) {
    settingsCache.set(key, setting.value);
    return setting.value;
  }

  return null;
};

/**
 * Invalidate a specific setting key from the cache.
 */
export const invalidateSetting = (key: string) => {
  settingsCache.delete(key);
};

/**
 * Clear all cached settings.
 */
export const invalidateAllSettings = () => {
  settingsCache.clear();
};
