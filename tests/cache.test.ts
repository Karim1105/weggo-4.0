import { describe, it, expect } from 'vitest'
import { getCache, setCache, deleteCache } from '@/lib/cache'

describe('cache', () => {
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
})
