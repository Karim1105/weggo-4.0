import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { logger, getRequestId } from '@/lib/logger'
import { refreshPopularCategories } from '@/lib/popularCategories'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/categories/popular
 * Admin "Refresh Trending" action: recompute the "Popular This Week" ranking
 * immediately and refresh the 5h cache instead of waiting for it to expire.
 */
async function handler(request: NextRequest) {
  const requestId = getRequestId(request)

  try {
    await connectDB()
    const result = await refreshPopularCategories()
    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    logger.error('Failed to refresh popular categories', error, { endpoint: '/api/admin/categories/popular' }, requestId)
    return NextResponse.json({ success: false, error: 'Failed to refresh trending categories' }, { status: 500 })
  }
}

export const POST = requireAdmin(handler)
