import mongoose from 'mongoose'
import { revalidateTag } from 'next/cache'
import { NextRequest } from 'next/server'
import { ApiErrors, errorResponse } from '@/lib/api-response'
import { getAuthUser } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { validateCreateListingForm } from '@/lib/validators'
import { applyPersistentRateLimit } from '@/lib/api/middleware/persistentRateLimit'
import { encodeCursor } from '@/lib/api/listings/cursor'
import { aggregateListings, countListings, createListingDocument, findListingByIdWithSeller } from '@/lib/api/listings/data'
import { cleanupUploadedImages, uploadListingImages } from '@/lib/api/listings/images'
import { buildListingsPipeline, sanitizeListing } from '@/lib/api/listings/pipeline'
import { parseCreateListingForm, parseListingsQuery } from '@/lib/api/listings/query'
import { ListingQueryParams, ListingsResult } from '@/lib/api/listings/types'

function mapCreateListingError(error: unknown) {
  if (error instanceof Error) {
    const uploadErrors = [
      'Invalid file type',
      'File size exceeds',
      'File content does not match',
      'You can upload up to',
      'Total image size is too large',
      'At least one image is required',
    ]

    if (uploadErrors.some((fragment) => error.message.includes(fragment))) {
      return ApiErrors.badRequest(error.message)
    }
  }

  if (typeof error === 'object' && error && 'name' in error && error.name === 'ValidationError') {
    const validationError = error as { errors?: Record<string, { message?: string }> }
    const errors: Record<string, string> = {}

    Object.keys(validationError.errors || {}).forEach((field) => {
      errors[field] = validationError.errors?.[field]?.message || 'Validation error'
    })

    return ApiErrors.validationError(errors)
  }

  return ApiErrors.serverError()
}

export async function getListingsService(request: NextRequest): Promise<Response> {
  const parseResult = parseListingsQuery(request.nextUrl.searchParams)
  if (!parseResult.ok) return parseResult.response

  const params: ListingQueryParams = parseResult.value

  if (params.sellerMe) {
    const user = await getAuthUser(request)
    if (!user) return ApiErrors.unauthorized()
    params.sellerId = String(user._id)
  }

  const { pipeline, query, fields } = buildListingsPipeline(params)
  const [items, total] = await Promise.all([
    aggregateListings(pipeline),
    params.includeTotal ? countListings(query) : Promise.resolve(null),
  ])

  const hasMore = items.length > params.limit
  const listingsSlice = items.slice(0, params.limit)
  const nextCursor = hasMore && listingsSlice.length > 0 ? encodeCursor(listingsSlice[listingsSlice.length - 1], fields) : null

  const result: ListingsResult = {
    listings: listingsSlice.map(sanitizeListing),
    limit: params.limit,
    total,
    totalPages: params.includeTotal && total !== null ? Math.max(1, Math.ceil(total / params.limit)) : null,
    hasMore,
    nextCursor,
  }

  return Response.json({ success: true, data: result }, { status: 200, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } })
}

export async function createListingService(request: NextRequest, requestId: string): Promise<Response> {
  const rateLimitResponse = await applyPersistentRateLimit(request, {
    namespace: 'listings:create',
    maxRequests: 10,
    windowMs: 15 * 60 * 1000,
  })

  if (rateLimitResponse) {
    logger.warn('Rate limit exceeded on listing creation', {}, requestId)
    return rateLimitResponse
  }

  const user = await getAuthUser(request)
  if (!user) {
    return ApiErrors.unauthorized()
  }

  const typedUser = user as typeof user & { banned?: boolean; sellerVerified?: boolean }

  if (typedUser.banned) {
    return errorResponse('Your account has been banned from listing items.', 403, 'ACCOUNT_BANNED')
  }

  if (!typedUser.sellerVerified) {
    return errorResponse(
      'You must be a verified seller to list items. Upload your government-issued ID in your profile first.',
      403,
      'VERIFICATION_REQUIRED'
    )
  }

  try {
    const formData = await request.formData()
    const parseResult = parseCreateListingForm(formData)
    if (!parseResult.ok) {
      return parseResult.response
    }

    const input = parseResult.value

    const validation = validateCreateListingForm({
      title: input.title,
      description: input.description,
      price: input.price,
      category: input.category,
      condition: input.normalizedCondition,
      location: input.location,
    })

    if (!validation.valid) {
      return ApiErrors.validationError(validation.errors)
    }

    const productId = new mongoose.Types.ObjectId()
    const images = await uploadListingImages(formData, user._id.toString(), productId.toString())

    try {
      await createListingDocument({
        productId,
        title: input.title,
        description: input.description,
        category: input.category,
        subcategory: input.subcategory,
        condition: input.normalizedCondition,
        price: input.price,
        location: input.location,
        images,
        sellerId: user._id,
      })
    } catch (dbError) {
      await cleanupUploadedImages(images)
      throw dbError
    }

    const product = await findListingByIdWithSeller(productId)
    if (!product) {
      await cleanupUploadedImages(images)
      return ApiErrors.serverError()
    }

    revalidateTag('listings', 'max')

    logger.info('Listing created successfully', { listingId: product._id, userId: user._id }, requestId)

    return Response.json(
      {
        success: true,
        data: { listing: sanitizeListing(product.toObject()) },
        message: 'Listing created successfully',
      },
      { status: 201 }
    )
  } catch (error) {
    return mapCreateListingError(error)
  }
}
