import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Product from '@/models/Product'
import { successResponse, ApiErrors } from '@/lib/api-response'
import { logger, getRequestId } from '@/lib/logger'
import { getCache, setCache } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)

  try {
    await connectDB()

    const cacheKey = 'categories:counts'
    const cached = getCache<{ counts: Record<string, number>; total: number }>(cacheKey)
    if (cached) {
      return successResponse(cached)
    }

    // Count listings by category
    const categoryCounts = await Product.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ])

    // Create a map of category -> count
    const counts: Record<string, number> = {}
    categoryCounts.forEach(item => {
      counts[item._id] = item.count
    })

    logger.info('Category counts fetched', { counts }, requestId)

    const result = {
      counts,
      total: categoryCounts.reduce((sum, item) => sum + item.count, 0)
    }

    setCache(cacheKey, result, 300)

    return successResponse(result)
  } catch (error: any) {
    logger.error('Failed to fetch category counts', error, { endpoint: '/api/categories/counts' }, requestId)
    return ApiErrors.serverError()
  }
}
