import { NextRequest, NextResponse } from 'next/server'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}
let cleanupInterval: NodeJS.Timeout | null = null

export function rateLimit(
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
) {
  return (req: NextRequest): NextResponse | null => {
    const ip = req.headers.get('x-forwarded-for') || 
               req.headers.get('x-real-ip') || 
               'unknown'
    
    const key = `rate_limit_${ip}`
    const now = Date.now()
    
    if (!store[key] || now > store[key].resetTime) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs,
      }
      return null
    }
    
    store[key].count++
    
    if (store[key].count > maxRequests) {
      return NextResponse.json(
        { success: false, error: 'Too many requests, please try again later' },
        { status: 429 }
      )
    }
    
    return null
  }
}

/**
 * Initialize cleanup of expired rate limit entries
 * Call this once on application startup
 */
export function initializeRateLimitCleanup() {
  if (cleanupInterval) return // Already initialized
  
  cleanupInterval = setInterval(() => {
    const now = Date.now()
    let cleaned = 0
    
    Object.keys(store).forEach(key => {
      if (store[key].resetTime < now) {
        delete store[key]
        cleaned++
      }
    })
    
    // Log cleanup if store is getting large
    const storeSize = Object.keys(store).length
    if (storeSize > 10000) {
      console.warn(`[RateLimit] Store size: ${storeSize}. Consider using Redis for distributed rate limiting.`)
    }
  }, 30000) // Cleanup every 30 seconds instead of 60
  
  // Prevent Node from hanging if this is the only active interval
  if (cleanupInterval.unref) {
    cleanupInterval.unref()
  }
}

/**
 * Get current store size for monitoring
 */
export function getRateLimitStoreSize(): number {
  return Object.keys(store).length
}


