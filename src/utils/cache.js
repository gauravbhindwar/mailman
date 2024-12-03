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

/**
 * Cache emails with validation
 */
export const cacheEmails = (key, emails, ttl = 300) => {
  if (!Array.isArray(emails)) {
    console.error('Invalid emails data for caching');
    return false;
  }

  const validatedEmails = emails.filter(email => 
    email && email.id && (email.subject || email.content)
  );

  return cache.set(key, validatedEmails, ttl);
};

/**
 * Get cached emails with refresh option
 */
export const getCachedEmails = (key, refresh = false) => {
  if (refresh) {
    cache.del(key);
    return null;
  }
  
  const emails = cache.get(key);
  return Array.isArray(emails) ? emails : null;
};

/**
 * Clear cache for a user's folder
 */
export const clearFolderCache = (userId, folder) => {
  const keys = cache.keys();
  const pattern = `emails:${userId}:${folder}`;
  const matchingKeys = keys.filter(key => key.startsWith(pattern));
  matchingKeys.forEach(key => cache.del(key));
  return matchingKeys.length;
};