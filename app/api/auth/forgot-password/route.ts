import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { rateLimit } from '@/lib/rateLimit'

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
      return NextResponse.json({
        success: true,
        message: 'If an account exists with that email, you will receive a reset link.',
        devResetLink: resetLink,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with that email, you will receive a reset link.',
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Request failed' },
      { status: 500 }
    )
  }
}
