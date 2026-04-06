import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import BanAppeal from '@/models/BanAppeal'
import { rateLimit } from '@/lib/rateLimit'
import { logger, getRequestId } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request)

  // Rate limiting
  const rateLimitResponse = rateLimit(5, 60 * 60 * 1000)(request)
  if (rateLimitResponse) {
    logger.warn('Rate limit exceeded on ban appeal', {}, requestId)
    return rateLimitResponse
  }

  try {
    await connectDB()

    const body = await request.json()
    const { email, appealMessage } = body

    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!appealMessage || !appealMessage.trim()) {
      return NextResponse.json(
        { success: false, error: 'Appeal message is required' },
        { status: 400 }
      )
    }

    const trimmedMessage = appealMessage.trim()
    if (trimmedMessage.length > 4096) {
      return NextResponse.json(
        { success: false, error: 'Appeal message cannot exceed 4096 characters' },
        { status: 400 }
      )
    }

    if (trimmedMessage.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Appeal message must be at least 10 characters' },
        { status: 400 }
      )
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      logger.info('warning: Ban appeal - user not found', { email }, requestId)
      return NextResponse.json(
        { success: false, error: 'Your appeal has been submitted successfully. Our team will review it within 48 hours.' },
        { status: 201 }
      )
    }

    if (!user.banned) {
      logger.info('warning: Ban appeal - user is not banned', { email, userId: user._id }, requestId)
      return NextResponse.json(
        { success: false, error: 'Your appeal has been submitted successfully. Our team will review it within 48 hours.' },
        { status: 201 }
      )
    }

    // Check if user already has a pending appeal
    const existingPendingAppeal = await BanAppeal.findOne({
      userId: user._id,
      status: 'pending',
    })

    if (existingPendingAppeal) {
      logger.info('Ban appeal - user already has pending appeal', { email, userId: user._id }, requestId)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Your appeal has been submitted successfully. Our team will review it within 48 hours.' 
        },
        { status: 201 }
      )
    }

    // Create new ban appeal
    const banAppeal = await BanAppeal.create({
      userId: user._id,
      bannedBy: user.bannedBy,
      reason: user.bannedReason || 'Account violation',
      appealMessage: trimmedMessage,
      status: 'pending',
    })

    logger.info('Ban appeal submitted successfully', { email, userId: user._id, appealId: banAppeal._id }, requestId)

    return NextResponse.json(
      {
        success: true,
        message: 'Your appeal has been submitted successfully. Our team will review it within 48 hours.',
        data: {
          appealId: banAppeal._id,
          status: banAppeal.status,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    logger.error('Ban appeal submission error', error, { endpoint: '/api/auth/ban-appeal' }, requestId)
    return NextResponse.json(
      { success: false, error: 'Failed to submit appeal. Please try again later.' },
      { status: 500 }
    )
  }
}
