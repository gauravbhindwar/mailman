import NodeCache from 'node-cache';

// Create a shared cache instance with 5 minute TTL
export const cache = new NodeCache({ 
  stdTTL: 300, // 5 minutes
  checkperiod: 320, // Check for expired keys every ~5.3 minutes
  useClones: false // Don't clone data, better performance
});

/**
 * Generate a standardized cache key
 */
export const getCacheKey = (userId, folder, page = 1, limit = 20) => {
  return `emails:${userId}:${folder}:${page}:${limit}`;
};

/**
 * Clear cache entries that match a pattern
 */
export const clearCacheByPattern = (pattern) => {
  const keys = cache.keys();
  const matchingKeys = keys.filter(key => key.includes(pattern));
  matchingKeys.forEach(key => cache.del(key));
  return matchingKeys.length;
};

/**
 * Clear cache by key
 */
export const clearCacheByKey = (key) => {
  return cache.del(key);
};

/**
 * Set cache with custom TTL
 */
export const setCacheWithTTL = (key, value, ttl) => {
  return cache.set(key, value, ttl);
};

/**
 * Get cache with refresh option
 */
export const getCache = (key, refresh = false) => {
  if (refresh) {
    cache.del(key);
    return null;
  }
  return cache.get(key);
};

/**
 * Clear all cache
 */
export const clearAllCache = () => {
  return cache.flushAll();
};