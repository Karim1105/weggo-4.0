import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Report from '@/models/Report'
import { requireAdmin } from '@/lib/auth'

// GET /api/admin/reports - Get all reports with filters
async function handler(request: NextRequest) {
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

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('listing', 'title images status seller')
        .populate('reporter', 'name email')
        .populate('reviewedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Report.countDocuments(query),
    ])

    return NextResponse.json({
      success: true,
      data: {
        reports,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        stats: {
          pending: await Report.countDocuments({ status: 'pending' }),
          reviewed: await Report.countDocuments({ status: 'reviewed' }),
          resolved: await Report.countDocuments({ status: 'resolved' }),
          dismissed: await Report.countDocuments({ status: 'dismissed' }),
        },
      },
    })
  } catch (error: any) {
    console.error('Get reports error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}

export const GET = requireAdmin(handler)
