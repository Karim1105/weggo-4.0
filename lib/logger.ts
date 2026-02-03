import { NextRequest } from 'next/server'

/**
 * Request ID tracking for logging correlation
 * Each request gets a unique ID for tracking across logs
 */

const requestIdMap = new WeakMap<NextRequest, string>()
const userContextMap = new WeakMap<NextRequest, { userId?: string; email?: string }>()

/**
 * Generate a unique request ID (short UUID)
 */
function generateRequestId(): string {
  return Math.random().toString(36).substring(2, 11)
}

/**
 * Get or create request ID
 */
export function getRequestId(request: NextRequest): string {
  if (!requestIdMap.has(request)) {
    requestIdMap.set(request, generateRequestId())
  }
  return requestIdMap.get(request)!
}

/**
 * Set user context for request logging
 */
export function setUserContext(request: NextRequest, userId?: string, email?: string) {
  userContextMap.set(request, { userId, email })
}

/**
 * Get user context from request
 */
function getUserContext(request?: NextRequest): Record<string, any> {
  if (!request) return {}
  const context = userContextMap.get(request)
  return context || {}
}

/**
 * Logger with request context
 */
export const logger = {
  info: (message: string, context?: Record<string, any>, requestId?: string, request?: NextRequest) => {
    console.log(
      JSON.stringify({
        level: 'INFO',
        message,
        requestId,
        timestamp: new Date().toISOString(),
        ...getUserContext(request),
        ...context,
      })
    )
  },

  warn: (message: string, context?: Record<string, any>, requestId?: string, request?: NextRequest) => {
    console.warn(
      JSON.stringify({
        level: 'WARN',
        message,
        requestId,
        timestamp: new Date().toISOString(),
        ...getUserContext(request),
        ...context,
      })
    )
  },

  error: (message: string, error?: Error | any, context?: Record<string, any>, requestId?: string, request?: NextRequest) => {
    console.error(
      JSON.stringify({
        level: 'ERROR',
        message,
        requestId,
        error: error?.message || String(error),
        stack: error?.stack,
        timestamp: new Date().toISOString(),
        ...getUserContext(request),
        ...context,
      })
    )
  },

  debug: (message: string, context?: Record<string, any>, requestId?: string, request?: NextRequest) => {
    if (process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development') {
      console.log(
        JSON.stringify({
          level: 'DEBUG',
          message,
          requestId,
          timestamp: new Date().toISOString(),
          ...getUserContext(request),
          ...context,
        })
      )
    }
  },
}
