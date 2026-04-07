import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import BanAppeal from '@/models/BanAppeal'
import { requireAuth } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { logger, getRequestId } from '@/lib/logger'

export const dynamic = 'force-dynamic'

async function handler(request: NextRequest, user: any) {
  const requestId = getRequestId(request)

  const rateLimitResponse = rateLimit(5, 60 * 60 * 1000)(request)
  if (rateLimitResponse) {
    logger.warn('Rate limit exceeded on authenticated ban appeal', { userId: user._id }, requestId)
    return rateLimitResponse
  }

  try {
    await connectDB()

    const body = await request.json()
    const appealMessage = typeof body?.appealMessage === 'string' ? body.appealMessage.trim() : ''

    if (!appealMessage) {
      return NextResponse.json(
        { success: false, error: 'Appeal message is required' },
        { status: 400 }
      )
    }

    if (appealMessage.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Appeal message must be at least 10 characters' },
        { status: 400 }
      )
    }

    if (appealMessage.length > 4096) {
      return NextResponse.json(
        { success: false, error: 'Appeal message cannot exceed 4096 characters' },
        { status: 400 }
      )
    }

    if (!user.banned) {
      return NextResponse.json(
        { success: false, error: 'Only banned users can submit an appeal' },
        { status: 400 }
      )
    }

    const existingPendingAppeal = await BanAppeal.findOne({
      userId: user._id,
      status: 'pending',
    })

    if (existingPendingAppeal) {
      return NextResponse.json(
        {
          success: false,
          error: 'You already have a pending appeal under review',
        },
        { status: 409 }
      )
    }

    const banAppeal = await BanAppeal.create({
      userId: user._id,
      bannedBy: user.bannedBy,
      reason: user.bannedReason || 'Account violation',
      appealMessage,
      status: 'pending',
    })

    logger.info('Authenticated ban appeal submitted', { userId: user._id, appealId: banAppeal._id }, requestId)

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
    logger.error('Authenticated ban appeal submission error', error, { endpoint: '/api/users/ban-appeals/submit' }, requestId)
    return NextResponse.json(
      { success: false, error: 'Failed to submit appeal. Please try again later.' },
      { status: 500 }
    )
  }
}

export const POST = requireAuth(handler)
