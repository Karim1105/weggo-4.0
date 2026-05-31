import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { rateLimit } from '@/lib/rateLimit'
import { sendEmail } from '@/lib/email/client'
import { renderPasswordResetEmail } from '@/lib/email/templates/passwordReset'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const rateLimitResponse = rateLimit(5, 15 * 60 * 1000)(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await request.json()
    const { email } = body
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    await connectDB()
    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with that email, you will receive a reset link.',
      })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    user.resetPasswordToken = tokenHash
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000)
    await user.save({ validateBeforeSave: false })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const resetLink = `${baseUrl.replace(/\/$/, '')}/reset-password?token=${token}`

    if (process.env.NODE_ENV === 'development') {
      console.info('[AUTH] Password reset link (dev only):', resetLink)
    }

    // Fire-and-await the email send. A failure is logged server-side but
    // never surfaced to the requester — surfacing it would leak whether an
    // account exists at this address.
    const { subject, html, text } = renderPasswordResetEmail({
      resetLink,
      userName: user.name,
      expiresInMinutes: 60,
    })
    const sendResult = await sendEmail({ to: user.email, subject, html, text })
    if (!sendResult.delivered) {
      logger.warn('Password reset email not delivered', {
        userId: String(user._id),
        provider: sendResult.provider,
        error: sendResult.error,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with that email, you will receive a reset link.',
    })
  } catch (error: any) {
    const message = process.env.NODE_ENV === 'production'
      ? 'Request failed'
      : error.message || 'Request failed'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
