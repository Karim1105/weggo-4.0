import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import BanAppeal from '@/models/BanAppeal'
import { requireAuth } from '@/lib/auth'
import { logger, getRequestId } from '@/lib/logger'

export const dynamic = 'force-dynamic'

async function handler(request: NextRequest, user: any) {
  const requestId = getRequestId(request)

  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const [appeals, total] = await Promise.all([
      BanAppeal.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BanAppeal.countDocuments({ userId: user._id }),
    ])

    logger.info('Fetched user ban appeals', { userId: user._id, count: appeals.length }, requestId)

    return NextResponse.json({
      success: true,
      data: {
        appeals,
        pagination: {
          page,
          limit,
          total,
          pages: Math.max(1, Math.ceil(total / limit)),
        },
      },
    })
  } catch (error: any) {
    logger.error('Fetch user ban appeals error', error, { endpoint: '/api/users/ban-appeals' }, requestId)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch appeals' },
      { status: 500 }
    )
  }
}

export const GET = requireAuth(handler)
