import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedPaths = ['/sell', '/profile', '/favorites']

// Paths that require admin privileges
const adminPaths = ['/appeal-review', '/admin', '/api/admin']

export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl
	const origin =
		process.env.NEXT_PUBLIC_SITE_URL ||
		request.nextUrl.origin
  const token = request.cookies.get('token')?.value
  const csrfToken = request.cookies.get('csrfToken')?.value

  const isProtected = protectedPaths.some((p) => pathname === p || pathname.startsWith(p + '/'))

  const isApiRequest = pathname.startsWith('/api')
  const isApiAdminRequest = pathname.startsWith('/api/admin')
  const isStateChanging = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)
  const csrfHeader = request.headers.get('x-csrf-token')

  // Helper to decode JWT payload (base64url). Uses atob in edge runtime or Buffer if available.
  function parseJwtPayload(tok?: string) {
    if (!tok) return null
    try {
      const parts = tok.split('.')
      if (parts.length < 2) return null
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
      let jsonString: string
      if (typeof globalThis.atob === 'function') {
        jsonString = globalThis.atob(base64)
      } else if (typeof (globalThis as any).Buffer === 'function') {
        jsonString = (globalThis as any).Buffer.from(base64, 'base64').toString('utf8')
      } else {
        return null
      }
      return JSON.parse(jsonString)
    } catch (e) {
      return null
    }
  }

  // Check if the current pathname matches any admin path (exact or nested)
  function isPathAdmin(p: string) {
    return pathname === p || pathname.startsWith(p + '/')
  }

  const isAdminPath = adminPaths.some(isPathAdmin)

  // If request targets an admin-only route, ensure token exists and user is admin
  if (isAdminPath) {
    const payload = parseJwtPayload(token)
    const isAdmin = !!(
      payload && (
        payload.isAdmin === true ||
        payload.admin === true ||
        payload.role === 'admin' ||
        (Array.isArray(payload.roles) && payload.roles.includes('admin'))
      )
    )

    if (!isAdmin) {
      // For API admin requests return 404 JSON, for pages rewrite to /404
      if (isApiAdminRequest) {
        return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
      }
      const notFoundUrl = new URL('/404', origin)
      return NextResponse.rewrite(notFoundUrl)
    }
  }

  // CSRF protection for state-changing API requests
  // Exempt logout and login endpoints
  if (isApiRequest && isStateChanging && token && pathname !== '/api/auth/logout' && pathname !== '/api/auth/login') {
	if (!csrfToken || !csrfHeader || csrfToken !== csrfHeader) {
	  return NextResponse.json(
		{ success: false, error: 'CSRF token missing or invalid' },
		{ status: 403 }
	  )
	}
  }

  if (isProtected && !token) {
		const loginUrl = new URL('/login', origin)
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
      "img-src 'self' data: https: blob:",
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
    '/admin',
    '/admin/:path*',
    '/api/:path*',
    '/appeals',
    '/appeals/:path*',
    '/appeal-review',
    '/appeal-review/:path*',
    '/api/admin/:path*',
  ],
}
