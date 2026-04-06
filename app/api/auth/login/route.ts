import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { generateToken } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { setCsrfTokenCookie } from '@/lib/csrf'
import { validateEmail } from '@/lib/validators'
import { logger, getRequestId } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request)

  // Rate limiting - stricter for login
  const rateLimitResponse = rateLimit(10, 15 * 60 * 1000)(request)
  if (rateLimitResponse) {
    logger.warn('Rate limit exceeded on login', {}, requestId)
    return rateLimitResponse
  }

  try {
    await connectDB()

    // Derive the public origin for redirects. Prefer the configured
    // NEXT_PUBLIC_SITE_URL to avoid localhost redirects behind proxies.
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      request.nextUrl.origin

    // Form login only (browser POST from /login page)
    const formData = await request.formData()
    const email = String(formData.get('email') || '').trim()
    const password = String(formData.get('password') || '')
    const redirectParam = String(formData.get('redirect') || '')

    logger.debug('Login attempt (form)', { email }, requestId)

    if (!email || !validateEmail(email)) {
      logger.info('Login failed - invalid email (form)', { email }, requestId)
      const errorUrl = new URL('/login?error=1', origin)
      return NextResponse.redirect(errorUrl, 303)
    }

    if (!password) {
      logger.info('Login failed - missing password (form)', { email }, requestId)
      const errorUrl = new URL('/login?error=1', origin)
      return NextResponse.redirect(errorUrl, 303)
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      logger.info('Login failed - user not found (form)', { email }, requestId)
      const errorUrl = new URL('/login?error=1', origin)
      return NextResponse.redirect(errorUrl, 303)
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      logger.info('Login failed - invalid password (form)', { email }, requestId)
      const errorUrl = new URL('/login?error=1', origin)
      return NextResponse.redirect(errorUrl, 303)
    }

    // Check if user is banned
    if (user.banned) {
      logger.info('Login failed - user is banned ', { email, userId: user._id }, requestId)
      const errorUrl = new URL(
        `/login?error=banned&reason=${encodeURIComponent(user.bannedReason || 'Your account has been banned')}`,
        origin
      )
      return NextResponse.redirect(errorUrl, 303)
    }

    const token = generateToken(user)

    // Base redirect: admins go to /admin, others to /
    const baseRedirect = user.role === 'admin' ? '/admin' : '/'

    // For non-admins, respect a safe internal redirect path when provided.
    const safeRedirect =
      user.role !== 'admin' &&
      redirectParam &&
      redirectParam.startsWith('/') &&
      !redirectParam.startsWith('//')
        ? redirectParam
        : baseRedirect

    // Use an absolute redirect based on the public origin.
    const redirectUrl = new URL(safeRedirect, origin)
    const response = NextResponse.redirect(redirectUrl, 303)

    // Set token expiration: 8 hours for admins, 7 days for regular users
    const maxAge = user.role === 'admin' ? 60 * 60 * 8 : 60 * 60 * 24 * 7

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: maxAge,
    })
    setCsrfTokenCookie(response)

    logger.info('User logged in successfully (form)', { email, userId: user._id }, requestId)

    return response
  } catch (error: any) {
    logger.error('Login error', error, { endpoint: '/api/auth/login' }, requestId)
    // On any server error, send the user back to the login page without
    // exposing internal details.
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      request.nextUrl.origin
    const errorUrl = new URL('/login?error=1', origin)
    return NextResponse.redirect(errorUrl, 303)
  }
}

