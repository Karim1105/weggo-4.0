import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'

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
})
