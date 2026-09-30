import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { rateLimit } from '@/lib/rateLimit'
import crypto from 'crypto'
import { validatePassword } from '@/lib/validators'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const rateLimitResponse = rateLimit(5, 15 * 60 * 1000)(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await request.json()
    const { token, password } = body
    if (!token || typeof token !== 'string' || !password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Token and new password are required' },
        { status: 400 }
      )
    }
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.message },
        { status: 400 }
      )
    }

    await connectDB()
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: new Date() },
    })
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset link. Please request a new one.' },
        { status: 400 }
      )
    }

    user.password = password
    user.resetPasswordToken = undefined
    user.resetPasswordExpires = undefined
    await user.save()

    return NextResponse.json({
      success: true,
      message: 'Password updated. You can now sign in.',
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Request failed' },
      { status: 500 }
    )
  }
}
