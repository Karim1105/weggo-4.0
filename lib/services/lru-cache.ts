import { LRUCache } from 'lru-cache'

export class BoundedLruCache<K extends {}, V extends {}> {
  private cache: LRUCache<K, V>

  constructor(max: number, ttlMs: number) {
    this.cache = new LRUCache<K, V>({
      max,
      ttl: ttlMs,
    })
  }

  get(key: K) {
    return this.cache.get(key)
  }

  set(key: K, value: V) {
    this.cache.set(key, value)
    return value
  }

  async getOrCompute(key: K, compute: () => Promise<V>) {
    const cached = this.cache.get(key)
    if (cached !== undefined) return cached

    const value = await compute()
    this.cache.set(key, value)
    return value
  }

  delete(key: K) {
    this.cache.delete(key)
  }

  clear() {
    this.cache.clear()
  }
}
