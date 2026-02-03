import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Product from '@/models/Product'
import { successResponse, ApiErrors } from '@/lib/api-response'
import { logger, getRequestId } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)

  try {
    await connectDB()

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

    return successResponse({
      counts,
      total: categoryCounts.reduce((sum, item) => sum + item.count, 0)
    })
  } catch (error: any) {
    logger.error('Failed to fetch category counts', error, { endpoint: '/api/categories/counts' }, requestId)
    return ApiErrors.serverError()
  }
}
