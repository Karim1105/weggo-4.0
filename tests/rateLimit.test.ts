import { describe, it, expect, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { rateLimit, getRateLimitStoreSize, resetRateLimitStateForTests } from '@/lib/rateLimit'

afterEach(() => {
  resetRateLimitStateForTests()
  vi.useRealTimers()
})

describe('rateLimit', () => {
  it('allows requests within limit and blocks after', () => {
    const limiter = rateLimit(2, 1000)
    const req = new NextRequest('http://localhost', {
      headers: new Headers({ 'x-forwarded-for': '1.1.1.1' }),
    })

    expect(limiter(req)).toBeNull()
    expect(limiter(req)).toBeNull()
    const blocked = limiter(req)
    expect(blocked?.status).toBe(429)
  })

  it('cleans up expired entries after lazy initialization', () => {
    vi.useFakeTimers()

    const limiter = rateLimit(1, 1000)
    const req = new NextRequest('http://localhost', {
      headers: new Headers({ 'x-forwarded-for': '2.2.2.2' }),
    })

    expect(limiter(req)).toBeNull()
    expect(getRateLimitStoreSize()).toBeGreaterThan(0)

    vi.advanceTimersByTime(31_000)

    expect(getRateLimitStoreSize()).toBe(0)
  })
})
