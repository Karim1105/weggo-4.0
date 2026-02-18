import NodeCache from 'node-cache'

const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 }) // 10 minutes default TTL

// Cache metrics for monitoring
let metrics = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  evictions: 0,
}

export function getCache<T>(key: string): T | undefined {
  const value = cache.get<T>(key)
  if (value !== undefined) {
    metrics.hits++
  } else {
    metrics.misses++
  }
  return value
}

export function setCache<T>(key: string, value: T, ttl: number = 600): boolean {
  metrics.sets++
  return cache.set(key, value, ttl)
}

export function deleteCache(key: string): number {
  const count = cache.del(key)
  if (count > 0) {
    metrics.deletes++
  }
  return count
}

export function clearCache(): void {
  cache.flushAll()
  // Reset metrics when cache is cleared
  const evictedKeys = cache.keys().length
  metrics.evictions += evictedKeys
}

export function clearCacheByPrefix(prefix: string): void {
  const keys = cache.keys().filter((k) => k.startsWith(prefix))
  if (keys.length > 0) {
    cache.del(keys)
    metrics.deletes += keys.length
  }
}

export function getCacheStats() {
  return cache.getStats()
}

// Get metrics for monitoring cache performance
export function getCacheMetrics() {
  const stats = cache.getStats()
  const totalRequests = metrics.hits + metrics.misses
  const hitRate = totalRequests > 0 ? (metrics.hits / totalRequests * 100).toFixed(2) : 'N/A'
  
  return {
    // Request metrics
    hits: metrics.hits,
    misses: metrics.misses,
    hitRate: hitRate + '%',
    totalRequests,
    
    // Operation metrics
    sets: metrics.sets,
    deletes: metrics.deletes,
    evictions: metrics.evictions,
    
    // Cache state
    keys: stats.keys,
    ksize: stats.ksize,
    vsize: stats.vsize,
  }
}

// Reset metrics (useful for periodic reporting)
export function resetCacheMetrics() {
  const previous = { ...metrics }
  metrics = { hits: 0, misses: 0, sets: 0, deletes: 0, evictions: 0 }
  return previous
}


