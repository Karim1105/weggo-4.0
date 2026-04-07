import { describe, it, expect, beforeEach } from 'vitest'
import {
  getCache,
  setCache,
  deleteCache,
  clearCache,
  getCacheMetrics,
  resetCacheMetrics,
} from '@/lib/cache'

describe('cache', () => {
  beforeEach(() => {
    clearCache()
    resetCacheMetrics()
  })

  it('sets and gets cache values', () => {
    setCache('test:key', { value: 123 }, 1)
    const value = getCache<{ value: number }>('test:key')
    expect(value?.value).toBe(123)
  })

  it('deletes cache values', () => {
    setCache('test:delete', { value: 1 }, 1)
    deleteCache('test:delete')
    const value = getCache('test:delete')
    expect(value).toBeUndefined()
  })

  it('tracks evictions when the cache is fully cleared', () => {
    setCache('test:one', { value: 1 }, 60)
    setCache('test:two', { value: 2 }, 60)

    clearCache()

    expect(getCacheMetrics().evictions).toBe(2)
  })
})
