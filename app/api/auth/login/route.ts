import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { generateToken } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { successResponse, ApiErrors } from '@/lib/api-response'
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

    const contentType = request.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')

    // JSON login (used by programmatic clients)
    if (isJson) {
      const body = await request.json()
      const { email, password } = body

      logger.debug('Login attempt (json)', { email }, requestId)

      // Validation
      if (!email || !validateEmail(email)) {
        return ApiErrors.badRequest('Please provide a valid email address')
      }

      if (!password) {
        return ApiErrors.badRequest('Password is required')
      }

      // Find user
      const user = await User.findOne({ email: email.toLowerCase() })
      if (!user) {
        logger.info('Login failed - user not found (json)', { email }, requestId)
        return ApiErrors.badRequest('Invalid email or password')
      }

      // Check password
      const isMatch = await user.comparePassword(password)
      if (!isMatch) {
        logger.info('Login failed - invalid password (json)', { email }, requestId)
        return ApiErrors.badRequest('Invalid email or password')
      }

      const token = generateToken(user)

      // Server-side decision about where the client should go next
      const redirectTo = user.role === 'admin' ? '/admin' : '/'

      const response = successResponse(
        {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            location: user.location,
            role: user.role,
            avatar: user.avatar,
          },
          redirectTo,
        },
        'Login successful'
      )

      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
      setCsrfTokenCookie(response)

      logger.info('User logged in successfully (json)', { email, userId: user._id }, requestId)

      return response
    }

    // Form login (browser POST from /login page)
    const formData = await request.formData()
    const email = String(formData.get('email') || '').trim()
    const password = String(formData.get('password') || '')
    const redirectParam = String(formData.get('redirect') || '')

    logger.debug('Login attempt (form)', { email }, requestId)

    if (!email || !validateEmail(email)) {
      logger.info('Login failed - invalid email (form)', { email }, requestId)
      return NextResponse.redirect(new URL('/login?error=1', request.url), 303)
    }

    if (!password) {
      logger.info('Login failed - missing password (form)', { email }, requestId)
      return NextResponse.redirect(new URL('/login?error=1', request.url), 303)
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      logger.info('Login failed - user not found (form)', { email }, requestId)
      return NextResponse.redirect(new URL('/login?error=1', request.url), 303)
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      logger.info('Login failed - invalid password (form)', { email }, requestId)
      return NextResponse.redirect(new URL('/login?error=1', request.url), 303)
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

    // Use a relative redirect so the browser stays on the public origin
    // instead of any internal host (like localhost:3000).
    const response = NextResponse.redirect(safeRedirect, 303)

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
    setCsrfTokenCookie(response)

    logger.info('User logged in successfully (form)', { email, userId: user._id }, requestId)

    return response
  } catch (error: any) {
    logger.error('Login error', error, { endpoint: '/api/auth/login' }, requestId)
    return ApiErrors.serverError()
  }
}

