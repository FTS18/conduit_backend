/**
 * Query Result Cache
 * Caches frequently accessed database queries to reduce load
 */

interface CachedQuery {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

const queryCache = new Map<string, CachedQuery>();

/**
 * Generate cache key from query parameters
 */
const generateCacheKey = (
  query: string,
  params?: Record<string, any>
): string => {
  return `${query}:${JSON.stringify(params || {})}`;
};

/**
 * Get cached query result
 */
export const getCachedQuery = <T = any>(
  query: string,
  params?: Record<string, any>
): T | null => {
  const key = generateCacheKey(query, params);
  const cached = queryCache.get(key);

  if (!cached) {
    return null;
  }

  // Check if cache expired
  if (Date.now() - cached.timestamp > cached.ttl) {
    queryCache.delete(key);
    return null;
  }

  return cached.data as T;
};

/**
 * Set query cache result
 */
export const setCachedQuery = <T = any>(
  query: string,
  data: T,
  ttl: number = 5 * 60 * 1000, // 5 minutes default
  params?: Record<string, any>
): void => {
  const key = generateCacheKey(query, params);
  queryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
};

/**
 * Invalidate specific cache key
 */
export const invalidateCache = (query: string, params?: Record<string, any>): void => {
  const key = generateCacheKey(query, params);
  queryCache.delete(key);
};

/**
 * Invalidate cache by pattern (e.g., all tag queries)
 */
export const invalidateCacheByPattern = (pattern: string): number => {
  let count = 0;
  const regex = new RegExp(pattern);

  queryCache.forEach((_, key) => {
    if (regex.test(key)) {
      queryCache.delete(key);
      count++;
    }
  });

  return count;
};

/**
 * Clear all cache
 */
export const clearAllCache = (): void => {
  queryCache.clear();
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  let totalSize = 0;
  queryCache.forEach(cached => {
    totalSize += JSON.stringify(cached.data).length;
  });

  return {
    entries: queryCache.size,
    approximateSizeKB: Math.round(totalSize / 1024),
    maxEntries: 500,
  };
};

/**
 * Cleanup expired cache entries
 */
export const cleanupExpiredCache = (): number => {
  let count = 0;
  const now = Date.now();

  queryCache.forEach((cached, key) => {
    if (now - cached.timestamp > cached.ttl) {
      queryCache.delete(key);
      count++;
    }
  });

  return count;
};

// Cleanup expired cache every 10 minutes
setInterval(() => {
  const count = cleanupExpiredCache();
  if (count > 0) {
    console.info(`[CACHE] Cleaned up ${count} expired query cache entries`);
  }
}, 10 * 60 * 1000);

// Monitor cache size and warn if getting large
setInterval(() => {
  const stats = getCacheStats();
  if (stats.entries > 400) {
    console.warn(`[CACHE] Query cache is large: ${stats.entries} entries, ${stats.approximateSizeKB}KB`);
  }
}, 5 * 60 * 1000);
