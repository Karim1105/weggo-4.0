import { NextRequest } from 'next/server'
import connectDB from '@/lib/db'
import { successResponse, ApiErrors } from '@/lib/api-response'
import { logger, getRequestId } from '@/lib/logger'
import { getPopularCategories, DEFAULT_POPULAR_LIMIT } from '@/lib/popularCategories'

export const dynamic = 'force-dynamic'

/**
 * GET /api/categories/popular
 * Returns the "Popular This Week" category ranking, derived from real listing
 * activity and cached for 5 hours. Powers the homepage Categories section.
 */
export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)

  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const rawLimit = parseInt(searchParams.get('limit') || String(DEFAULT_POPULAR_LIMIT), 10)
    const limit = Math.min(Math.max(Number.isNaN(rawLimit) ? DEFAULT_POPULAR_LIMIT : rawLimit, 1), 10)

    const result = await getPopularCategories(limit)

    // Public consumers (the homepage) only need the ranking. The internal
    // `scores` map (aggregated view counts per category) is omitted to avoid
    // leaking marketplace metrics; it stays available on the admin endpoint.
    return successResponse({ popular: result.popular, computedAt: result.computedAt })
  } catch (error: any) {
    logger.error('Failed to fetch popular categories', error, { endpoint: '/api/categories/popular' }, requestId)
    return ApiErrors.serverError()
  }
}
