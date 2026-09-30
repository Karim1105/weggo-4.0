import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { generateToken } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { setCsrfTokenCookie } from '@/lib/csrf'
import { validateEmail } from '@/lib/validators'
import { logger, getRequestId } from '@/lib/logger'
import { getSafeRedirectPath } from '@/lib/safeRedirect'

export const dynamic = 'force-dynamic'

// Redirect with a relative Location so the browser stays on the origin it
// submitted the form from. An absolute URL built from the server's view of
// the origin can differ (localhost behind a proxy, www vs apex), and the
// CSP's form-action 'self' blocks cross-origin redirects after a form post.
function seeOther(path: string): NextResponse {
  return new NextResponse(null, { status: 303, headers: { Location: path } })
}

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
    const isJsonRequest = contentType.includes('application/json')

    // Base origin used only to validate the user-supplied redirect path.
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      request.nextUrl.origin

    let email = ''
    let password = ''
    let redirectParam = ''

    if (isJsonRequest) {
      const body = await request.json().catch(() => null)
      email = String(body?.email || '').trim()
      password = String(body?.password || '')
      redirectParam = String(body?.redirect || '')
    } else {
      const formData = await request.formData()
      email = String(formData.get('email') || '').trim()
      password = String(formData.get('password') || '')
      redirectParam = String(formData.get('redirect') || '')
    }

    logger.debug('Login attempt', { email, mode: isJsonRequest ? 'json' : 'form' }, requestId)

    if (!email || !validateEmail(email)) {
      logger.info('Login failed - invalid email', { email }, requestId)
      if (isJsonRequest) {
        return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 400 })
      }
      return seeOther('/login?error=1')
    }

    if (!password) {
      logger.info('Login failed - missing password', { email }, requestId)
      if (isJsonRequest) {
        return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 400 })
      }
      return seeOther('/login?error=1')
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      logger.info('Login failed - user not found', { email }, requestId)
      if (isJsonRequest) {
        return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
      }
      return seeOther('/login?error=1')
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      logger.info('Login failed - invalid password', { email }, requestId)
      if (isJsonRequest) {
        return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 })
      }
      return seeOther('/login?error=1')
    }

    // Check if user is banned
    if (user.banned) {
      logger.info('Login failed - user is banned ', { email, userId: user._id }, requestId)
      if (isJsonRequest) {
        return NextResponse.json(
          { success: false, error: user.bannedReason || 'Your account has been banned' },
          { status: 403 }
        )
      }
      return seeOther(
        `/login?error=banned&reason=${encodeURIComponent(user.bannedReason || 'Your account has been banned')}`
      )
    }

    const token = generateToken(user)

    // Base redirect: admins go to /admin, others to /
    const baseRedirect = user.role === 'admin' ? '/admin' : '/'

    // For non-admins, respect a safe internal redirect path when provided.
    const safeRedirect =
      (user.role !== 'admin' && getSafeRedirectPath(redirectParam, origin)) || baseRedirect

    const response = isJsonRequest
      ? NextResponse.json({
          success: true,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            sellerVerified: (user as any).sellerVerified ?? false,
          },
          redirect: safeRedirect,
        })
      : seeOther(safeRedirect)

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

    // Invalidate layout cache so navbar reflects the new auth state immediately.
    try {
      revalidatePath('/', 'layout')
    } catch {
      // No static generation store in direct route unit/integration execution.
    }

    logger.info('User logged in successfully', { email, userId: user._id, mode: isJsonRequest ? 'json' : 'form' }, requestId)

    return response
  } catch (error: any) {
    logger.error('Login error', error, { endpoint: '/api/auth/login' }, requestId)
    if ((request.headers.get('content-type') || '').includes('application/json')) {
      return NextResponse.json({ success: false, error: 'Login failed' }, { status: 500 })
    }
    // On any server error, send the user back to the login page without
    // exposing internal details.
    return seeOther('/login?error=1')
  }
}

