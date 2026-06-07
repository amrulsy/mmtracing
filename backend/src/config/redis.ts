import IORedis from 'ioredis';
import logger from './logger';
// In-memory fallback
const fallbackMap = new Map<string, { value: string, exp: number }>();

export const redis = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    if (process.env.NODE_ENV !== 'production' && times > 3) {
      logger.warn('[REDIS] Gagal terhubung ke Redis. Berjalan dalam mode fallback (In-Memory).');
      return null; // Stop retrying
    }
    return Math.min(times * 50, 2000);
  }
});

redis.on('error', (err: any) => {
  if (err.code === 'ECONNREFUSED') {
    // Suppressed
  } else {
    logger.error('[REDIS ERROR]', err.message);
  }
});

// Safe setex for OTP fallback
export const safeSetex = async (key: string, seconds: number, value: string) => {
  if (redis.status === 'ready') {
    return redis.setex(key, seconds, value);
  }
  fallbackMap.set(key, { value, exp: Date.now() + seconds * 1000 });
  return 'OK';
};

// Safe get for OTP fallback
export const safeGet = async (key: string) => {
  if (redis.status === 'ready') {
    return redis.get(key);
  }
  const item = fallbackMap.get(key);
  if (!item) return null;
  if (Date.now() > item.exp) {
    fallbackMap.delete(key);
    return null;
  }
  return item.value;
};

// Safe del
export const safeDel = async (key: string) => {
  if (redis.status === 'ready') {
    return redis.del(key);
  }
  fallbackMap.delete(key);
  return 1;
};
