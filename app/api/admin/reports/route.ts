import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Report from '@/models/Report'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

    const [reportsRaw, total] = await Promise.all([
      Report.find(query)
        .populate('listing', 'title images status seller')
        .populate('reporter', 'name')
        .populate('reviewedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Report.countDocuments(query),
    ])

    const reports = reportsRaw.map((report: any) => ({
      ...report,
      listing: report.listing
        ? {
            ...report.listing,
            images: Array.isArray(report.listing.images)
              ? report.listing.images
                  .filter((img: string) => typeof img === 'string' && !img.startsWith('data:'))
                  .slice(0, 1)
              : [],
          }
        : report.listing,
    }))

    const response = NextResponse.json({
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

    // Add cache control headers to prevent browser caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response
  } catch (error: any) {
    console.error('Get reports error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}

export const GET = requireAdmin(handler)
