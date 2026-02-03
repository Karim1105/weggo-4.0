import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedPaths = ['/sell', '/profile', '/favorites']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('token')?.value
  const csrfToken = request.cookies.get('csrfToken')?.value

  const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))

  const isApiRequest = pathname.startsWith('/api')
  const isStateChanging = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)
  const csrfHeader = request.headers.get('x-csrf-token')

  // CSRF protection for state-changing API requests
  // Exempt logout endpoint since it's clearing the session anyway
  if (isApiRequest && isStateChanging && token && pathname !== '/api/auth/logout') {
    if (!csrfToken || !csrfHeader || csrfToken !== csrfHeader) {
      return NextResponse.json(
        { success: false, error: 'CSRF token missing or invalid' },
        { status: 403 }
      )
    }
  }

  if (isProtected && !token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Add security headers
  const response = NextResponse.next()
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')
  
  // Enable browser XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Restrict feature access
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  // Content Security Policy - prevent XSS and injection attacks
  const scriptSrc = ["'self'", "'unsafe-inline'"]
  if (process.env.NODE_ENV !== 'production') {
    scriptSrc.push("'unsafe-eval'")
  }
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      `script-src ${scriptSrc.join(' ')}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; ')
  )
  
  // HSTS - enforce HTTPS
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  return response
}

export const config = {
  matcher: [
    '/sell',
    '/sell/:path*',
    '/profile',
    '/profile/:path*',
    '/favorites',
    '/favorites/:path*',
    '/api/:path*',
  ],
}
