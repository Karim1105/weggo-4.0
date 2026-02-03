import { NextRequest, NextResponse } from 'next/server'
import { randomBytes, timingSafeEqual } from 'crypto'

/**
 * CSRF (Cross-Site Request Forgery) Protection
 * Implements the double-submit cookie pattern.
 */

const CSRF_COOKIE_NAME = 'csrfToken'

export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex')
}

export function setCsrfTokenCookie(response: NextResponse): string {
  const token = generateCsrfToken()
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
  return token
}

export function clearCsrfTokenCookie(response: NextResponse) {
  response.cookies.set(CSRF_COOKIE_NAME, '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0)
  })
}

/**
 * Validate CSRF for state-changing requests when cookie auth is present.
 */
export function validateCsrfRequest(request: NextRequest): NextResponse | null {
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    return null
  }

  // Skip CSRF for bearer token APIs
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return null
  }

  const csrfCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value
  const csrfHeader = request.headers.get('x-csrf-token')

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return NextResponse.json(
      { success: false, error: 'CSRF token missing or invalid' },
      { status: 403 }
    )
  }

  return null
}
