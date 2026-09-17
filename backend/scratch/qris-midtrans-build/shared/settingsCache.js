"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateAllSettings = exports.invalidateSetting = exports.getSetting = void 0;
const db_1 = __importDefault(require("../config/db"));
const cache_1 = require("./cache");
const SETTING_PREFIX = 'setting:';
/**
 * Get setting value from cache, or fallback to database if not in cache.
 * Uses TTL-backed appCache (30 min TTL) — auto-expires so DB changes are picked up.
 */
const getSetting = async (key) => {
    const cacheKey = SETTING_PREFIX + key;
    return cache_1.appCache.getOrSet(cacheKey, async () => {
        const setting = await db_1.default.queryOne('SELECT `value` FROM settings WHERE `key` = ?', [key]);
        return setting?.value ?? null;
    }, cache_1.CACHE_TTL.VERY_LONG);
};
exports.getSetting = getSetting;
/**
 * Invalidate a specific setting key from the cache.
 */
const invalidateSetting = (key) => {
    cache_1.appCache.invalidate(SETTING_PREFIX + key);
};
exports.invalidateSetting = invalidateSetting;
/**
 * Clear all cached settings.
 */
const invalidateAllSettings = () => {
    cache_1.appCache.invalidatePrefix(SETTING_PREFIX);
};
exports.invalidateAllSettings = invalidateAllSettings;
//# sourceMappingURL=settingsCache.js.map