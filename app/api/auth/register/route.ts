import { NextRequest } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { generateToken } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { successResponse, ApiErrors } from '@/lib/api-response'
import { setCsrfTokenCookie } from '@/lib/csrf'
import { validateRegisterForm } from '@/lib/validators'
import { logger, getRequestId } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request)

  // Rate limiting
  const rateLimitResponse = rateLimit(5, 15 * 60 * 1000)(request)
  if (rateLimitResponse) {
    logger.warn('Rate limit exceeded', { endpoint: '/api/auth/register' }, requestId)
    return rateLimitResponse
  }

  try {
    await connectDB()
    const body = await request.json()
    const { name, email, password, phone, location } = body

    logger.debug('Registration attempt', { email }, requestId)

    // Validation
    const validation = validateRegisterForm({ name, email, password, phone, location })
    if (!validation.valid) {
      return ApiErrors.validationError(validation.errors)
    }

    // Check if user exists before attempting create (prevents duplicate key error)
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      logger.info('Registration failed - user already exists', { email }, requestId)
      return ApiErrors.conflict('Email address is already registered. Please log in or use a different email.')
    }

    // Create user
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      phone,
      location,
    })

    const token = generateToken(user)

    const response = successResponse(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        location: user.location,
        role: user.role,
      },
      'Registration successful',
      201
    )

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
    setCsrfTokenCookie(response)

    logger.info('User registered successfully', { email, userId: user._id }, requestId)

    return response
  } catch (error: any) {
    logger.error('Registration error', error, { endpoint: '/api/auth/register' }, requestId)

    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0]
      return ApiErrors.conflict(`${field.charAt(0).toUpperCase() + field.slice(1)} already in use`)
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors: Record<string, string> = {}
      Object.keys(error.errors).forEach((field) => {
        errors[field] = error.errors[field].message
      })
      return ApiErrors.validationError(errors)
    }

    return ApiErrors.serverError()
  }
}


