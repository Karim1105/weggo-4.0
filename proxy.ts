import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedPaths = ['/sell', '/profile', '/favorites']

// Paths that require admin privileges
const adminPaths = ['/appeal-review', '/admin', '/api/admin']

function base64UrlToBytes(input: string): Uint8Array {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

// Verify an HS256 JWT signature and expiry. Decoding the payload without
// checking the signature would let anyone forge `role: 'admin'`.
async function verifyJwt(tok?: string): Promise<Record<string, any> | null> {
  if (!tok) return null
  const secret =
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV === 'production' ? '' : 'dev-secret-do-not-use-in-production')
  if (!secret) return null
  try {
    const parts = tok.split('.')
    if (parts.length !== 3) return null
    const [headerB64, payloadB64, signatureB64] = parts
    const header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(headerB64)))
    if (header?.alg !== 'HS256') return null

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToBytes(signatureB64) as BufferSource,
      encoder.encode(`${headerB64}.${payloadB64}`)
    )
    if (!valid) return null

    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadB64)))
    if (typeof payload?.exp === 'number' && payload.exp * 1000 <= Date.now()) return null
    return payload
  } catch {
    return null
  }
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function proxy(request: NextRequest) {
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

  // Check if the current pathname matches any admin path (exact or nested)
  function isPathAdmin(p: string) {
    return pathname === p || pathname.startsWith(p + '/')
  }

  const isAdminPath = adminPaths.some(isPathAdmin)

  // If request targets an admin-only route, ensure token exists and user is admin
  if (isAdminPath) {
    const payload = await verifyJwt(token)
    const isAdmin = payload?.role === 'admin'

    if (!isAdmin) {
      // For API admin requests return 404 JSON, for pages rewrite to /404
      if (isApiAdminRequest) {
        return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
      }
      const notFoundUrl = new URL('/404', origin)
      return NextResponse.rewrite(notFoundUrl)
    }
  }

  // AI chatbot endpoints require authentication at the edge. The route
  // handlers also re-check, but rejecting unauthenticated requests here
  // means we never hit the upstream Python service for anonymous traffic.
  const isAiChatRoute = pathname === '/api/ai-chat' || pathname === '/api/chat'
  if (isAiChatRoute && !token) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    )
  }

  // CSRF protection for state-changing API requests
  // Exempt logout and login endpoints
  if (isApiRequest && isStateChanging && token && pathname !== '/api/auth/logout' && pathname !== '/api/auth/login') {
	if (!csrfToken || !csrfHeader || !timingSafeEqualStrings(csrfToken, csrfHeader)) {
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
