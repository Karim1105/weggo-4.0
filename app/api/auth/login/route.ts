import { NextRequest } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { generateToken } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { successResponse, ApiErrors } from '@/lib/api-response'
import { setCsrfTokenCookie } from '@/lib/csrf'
import { validateEmail } from '@/lib/validators'
import { logger, getRequestId } from '@/lib/logger'

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
    const body = await request.json()
    const { email, password } = body

    logger.debug('Login attempt', { email }, requestId)

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
      logger.info('Login failed - user not found', { email }, requestId)
      return ApiErrors.badRequest('Invalid email or password')
    }

    // Check password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      logger.info('Login failed - invalid password', { email }, requestId)
      return ApiErrors.badRequest('Invalid email or password')
    }

    const token = generateToken(user)

    const response = successResponse(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        location: user.location,
        role: user.role,
        avatar: user.avatar,
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

    logger.info('User logged in successfully', { email, userId: user._id }, requestId)

    return response
  } catch (error: any) {
    logger.error('Login error', error, { endpoint: '/api/auth/login' }, requestId)
    return ApiErrors.serverError()
  }
}

