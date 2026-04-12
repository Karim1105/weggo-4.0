import { NextRequest } from 'next/server'
import connectDB from '@/lib/db'
import { ApiErrors } from '@/lib/api-response'
import { getRequestId, logger } from '@/lib/logger'
import { createListingService, getListingsService } from '@/lib/api/listings/service'

function logAndFail(requestId: string, message: string, error: unknown) {
  logger.error(message, error as Error, { endpoint: '/api/listings' }, requestId)
  return ApiErrors.serverError()
}

export async function getListingsController(request: NextRequest) {
  const requestId = getRequestId(request)

  try {
    await connectDB()
    const response = await getListingsService(request)

    if (response.ok) {
      const data = await response.clone().json()
      const payload = data?.data || {}
      logger.debug(
        'Listings fetched',
        {
          count: Array.isArray(payload.listings) ? payload.listings.length : 0,
          limit: payload.limit,
          hasMore: Boolean(payload.hasMore),
        },
        requestId
      )
    }

    return response
  } catch (error) {
    return logAndFail(requestId, 'Error fetching listings', error)
  }
}

export async function createListingController(request: NextRequest) {
  const requestId = getRequestId(request)

  try {
    await connectDB()
    return await createListingService(request, requestId)
  } catch (error) {
    return logAndFail(requestId, 'Error creating listing', error)
  }
}
