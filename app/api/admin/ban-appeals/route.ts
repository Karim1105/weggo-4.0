import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import BanAppeal from '@/models/BanAppeal'
import { requireAdmin } from '@/lib/auth'
import { logger, getRequestId } from '@/lib/logger'

async function handler(request: NextRequest, admin: any) {
  const requestId = getRequestId(request)

  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') || 'all'

    const skip = (page - 1) * limit

    const query: any = {}
    if (status !== 'all') {
      query.status = status
    }

    const [appeals, total] = await Promise.all([
      BanAppeal.find(query)
        .populate('userId', 'name email bannedAt bannedReason')
        .populate('bannedBy', 'name')
        .populate('reviewedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BanAppeal.countDocuments(query),
    ])

    logger.info('Fetched ban appeals', { page, limit, status, count: appeals.length }, requestId)

    return NextResponse.json({
      success: true,
      data: {
        appeals,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        stats: {
          // 0: pending, 1: approved, 2: rejected
          0: await BanAppeal.countDocuments({ status: 'pending' }),
          1: await BanAppeal.countDocuments({ status: 'approved' }),
          2: await BanAppeal.countDocuments({ status: 'rejected' }),
        },
      },
    })
  } catch (error: any) {
    logger.error('Fetch ban appeals error', error, { endpoint: '/api/admin/ban-appeals' }, requestId)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch ban appeals' },
      { status: 500 }
    )
  }
}

export const GET = requireAdmin(handler)
