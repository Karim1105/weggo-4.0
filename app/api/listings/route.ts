import fs from 'fs/promises'
import path from 'path'
import mongoose from 'mongoose'
import { revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Product from '@/models/Product'
import { getAuthUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { handleImageUpload } from '@/lib/imageUpload'
import { successResponse, errorResponse, ApiErrors } from '@/lib/api-response'
import { normalizeCondition, validateCreateListingForm } from '@/lib/validators'
import { logger, getRequestId } from '@/lib/logger'

export const dynamic = 'force-dynamic' //no Cache

const MAX_PAGE_SIZE = 100
const MAX_FILTER_LENGTH = 100
const MAX_TEXT_LENGTH = 2000

const MAX_SORT_LENGTH = 120
const ALLOWED_FRONTEND_SORT_KEYS = new Set(['createdAt', 'price', 'averageRating', 'ratingCount'])

type SortDirection = 1 | -1

type CursorPayload = {
  isBoosted: number
  relevanceScore?: number
  price?: number
  averageRating?: number
  ratingCount?: number
  createdAt: string
  _id: string
}

type SortField = {
  key: keyof CursorPayload
  direction: SortDirection
}

type ListingQueryParams = {
  category: string | null
  subcategory: string | null
  location: string | null
  condition: string | null
  minPrice: number | null
  maxPrice: number | null
  search: string | null
  sort: string | null
  includeTotal: boolean
  limit: number
  cursor: string | null
  sellerId: string | null
  status: 'active' | 'sold' | 'pending' | 'deleted' | 'all'
  stateFilter: '!=deleted' | null
}

function parseInteger(value: string | null, fallback: number, min: number, max: number): number | null {
  if (value === null || value === '') return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed < min || parsed > max) {
    return null
  }
  return parsed
}

function parsePrice(value: string | null): number | null {
  if (value === null || value === '') return null
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed < 0) {
    return Number.NaN
  }
  return parsed
}

function safeText(value: FormDataEntryValue | null, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > maxLength) return null
  return trimmed
}

function escapeRegex(input: string): string { //remove special characters from user input for security and to prevent regex errors
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')//don't remove
}

function getSortConfigFromFrontend(sortParam: string | null, useTextScore: boolean): { sort: Record<string, any>; fields: SortField[] } {
  const sort: Record<string, any> = { isBoosted: -1 }
  const fields: SortField[] = [{ key: 'isBoosted', direction: -1 }]

  if (useTextScore) {
    sort.relevanceScore = { $meta: 'textScore' }
    fields.push({ key: 'relevanceScore', direction: -1 })
  }

  const normalized = (sortParam || '').trim().toLowerCase()
  const tokens = normalized ? normalized.split(',') : []
  const seen = new Set<string>()

  tokens.forEach((token) => {
    const [keyRaw, directionRaw] = token.split(':').map((part) => part.trim())
    if (!keyRaw || !directionRaw || seen.has(keyRaw) || !ALLOWED_FRONTEND_SORT_KEYS.has(keyRaw)) {
      return
    }

    const direction: SortDirection | null =
      directionRaw === 'asc' || directionRaw === '1'
        ? 1
        : directionRaw === 'desc' || directionRaw === '-1'
          ? -1
          : null

    if (!direction) return

    const key = keyRaw as keyof CursorPayload
    sort[key] = direction
    fields.push({ key, direction })
    seen.add(keyRaw)
  })

  if (!seen.has('createdAt')) {
    sort.createdAt = -1
    fields.push({ key: 'createdAt', direction: -1 })
  }

  const idDirection = (sort.createdAt as SortDirection | undefined) || -1
  sort._id = idDirection
  fields.push({ key: '_id', direction: idDirection })

  return { sort, fields }
}

function decodeCursor(value: string | null): CursorPayload | null {
  if (!value) return null
  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf8')
    const parsed = JSON.parse(decoded) as CursorPayload
    if (!parsed?._id || !parsed?.createdAt) return null
    if (!mongoose.Types.ObjectId.isValid(parsed._id)) return null
    if (Number.isNaN(new Date(parsed.createdAt).getTime())) return null
    return parsed
  } catch {
    return null
  }
}

function encodeCursor(item: any, fields: SortField[]): string {
  const payload: Record<string, string | number> = {
    _id: String(item._id),
    createdAt: new Date(item.createdAt).toISOString(),
    isBoosted: Number(item.isBoosted || 0),
  }

  fields.forEach((field) => {
    if (field.key === '_id' || field.key === 'createdAt' || field.key === 'isBoosted') return
    if (typeof item[field.key] === 'number') {
      payload[field.key] = item[field.key]
    }
  })

  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

function buildCursorMatch(cursor: CursorPayload, fields: SortField[]): Record<string, any> {
  const cursorObjectId = new mongoose.Types.ObjectId(cursor._id)
  const cursorDate = new Date(cursor.createdAt)

  const orConditions = fields.map((field, index) => {
    const condition: Record<string, any> = {}

    for (let i = 0; i < index; i += 1) {
      const previous = fields[i]
      if (previous.key === '_id') {
        condition._id = cursorObjectId
      } else if (previous.key === 'createdAt') {
        condition.createdAt = cursorDate
      } else {
        condition[previous.key] = (cursor as any)[previous.key] ?? 0
      }
    }

    const op = field.direction === 1 ? '$gt' : '$lt'
    if (field.key === '_id') {
      condition._id = { [op]: cursorObjectId }
    } else if (field.key === 'createdAt') {
      condition.createdAt = { [op]: cursorDate }
    } else {
      condition[field.key] = { [op]: (cursor as any)[field.key] ?? 0 }
    }

    return condition
  })

  return { $or: orConditions }
}

function sanitizeListing(product: any) {
  const imagesArr = Array.isArray(product.images)
    ? product.images.filter((img: string) => typeof img === 'string' && !img.startsWith('data:'))
    : []

  const description = typeof product.description === 'string' && product.description.length > 200
    ? `${product.description.slice(0, 200)}...`
    : product.description

  return {
    _id: product._id,
    title: product.title,
    price: product.price,
    category: product.category,
    subcategory: product.subcategory,
    condition: product.condition,
    location: product.location,
    status: product.status,
    createdAt: product.createdAt,
    seller: product.seller,
    images: imagesArr.length ? [imagesArr[0]] : [],
    description,
  }
}

async function fetchListingsData(params: ListingQueryParams) {
  const query: Record<string, any> = { status: 'active' }
  if (params.sellerId) {
    query.seller = new mongoose.Types.ObjectId(params.sellerId)
    if (params.status === 'all') {
      delete query.status
    } else {
      query.status = params.status
    }
  }

  if (params.category && params.category !== 'all') {
    query.category = params.category
  }
  if (params.subcategory && params.subcategory !== 'all') {
    query.subcategory = params.subcategory
  }

  const locationTerm = params.location?.trim() || ''
  if (locationTerm) {
    query.location = { $regex: escapeRegex(locationTerm), $options: 'i' }
  }

  if (params.minPrice !== null || params.maxPrice !== null) {
    query.price = {}
    if (params.minPrice !== null) query.price.$gte = params.minPrice
    if (params.maxPrice !== null) query.price.$lte = params.maxPrice
  }

  if (params.condition && params.condition !== 'all') {
    query.condition = params.condition
  }

  if (params.stateFilter === '!=deleted') {
    query.status = { $ne: 'deleted' }
  }

  const searchTerm = params.search?.trim() || ''
  if (searchTerm) {
    query.$text = { $search: searchTerm }
  }

  const { sort, fields } = getSortConfigFromFrontend(params.sort, Boolean(searchTerm))
  const cursor = decodeCursor(params.cursor)

  const pipeline: any[] = [{ $match: query }]

  if (searchTerm) {
    pipeline.push({ $addFields: { relevanceScore: { $meta: 'textScore' } } })
  }

  if (cursor) {
    pipeline.push({ $match: buildCursorMatch(cursor, fields) })
  }

  pipeline.push({ $sort: sort })
  pipeline.push({ $limit: params.limit + 1 })
  pipeline.push(
    {
      $lookup: {
        from: 'users',
        localField: 'seller',
        foreignField: '_id',
        as: 'seller',
        pipeline: [{ $project: { name: 1, avatar: 1, sellerVerified: 1, averageRating: 1, totalSales: 1 } }],
      },
    },
    {
      $unwind: {
        path: '$seller',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        title: 1,
        price: 1,
        images: 1,
        category: 1,
        location: 1,
        condition: 1,
        description: 1,
        subcategory: 1,
        createdAt: 1,
        status: 1,
        seller: 1,
        isBoosted: 1,
        relevanceScore: 1,
        averageRating: 1,
        ratingCount: 1,
      },
    }
  )

  const [items, total] = await Promise.all([
    Product.aggregate(pipeline).exec(),
    params.includeTotal ? Product.countDocuments(query) : Promise.resolve(null),
  ])

  const hasMore = items.length > params.limit
  const listings = items.slice(0, params.limit)
  const nextCursor = hasMore && listings.length > 0 ? encodeCursor(listings[listings.length - 1], fields) : null

  return {
    listings: listings.map((item) => sanitizeListing(item)),
    limit: params.limit,
    total,
    totalPages: params.includeTotal && total !== null ? Math.max(1, Math.ceil(total / params.limit)) : null,
    hasMore,
    nextCursor,
  }
}

async function applyPersistentRateLimit(request: NextRequest): Promise<NextResponse | null> {
  try {
    const ip = (request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown').split(',')[0].trim()
    const now = new Date()
    const resetAt = new Date(Date.now() + 15 * 60 * 1000)

    const schema = new mongoose.Schema(
      {
        key: { type: String, required: true, unique: true },
        count: { type: Number, required: true, default: 0 },
        expiresAt: { type: Date, required: true },
      },
      { versionKey: false }
    )
    schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

    const RateLimitModel =
      (mongoose.models.ApiRateLimit as mongoose.Model<any>) || mongoose.model('ApiRateLimit', schema)

    const activeRecord = await RateLimitModel.findOneAndUpdate(
      { key: `listings:create:${ip}`, expiresAt: { $gt: now } },
      { $inc: { count: 1 } },
      { new: true }
    )

    if (!activeRecord) {
      await RateLimitModel.findOneAndUpdate(
        { key: `listings:create:${ip}` },
        { $set: { key: `listings:create:${ip}`, count: 1, expiresAt: resetAt } },
        { upsert: true }
      )
      return null
    }

    if (activeRecord.count > 10) {
      return NextResponse.json(
        { success: false, error: 'Too many requests, please try again later' },
        { status: 429 }
      )
    }

    return null
  } catch {
    return rateLimit(10, 15 * 60 * 1000)(request)
  }
}

async function cleanupUploadedImages(imagePaths: string[]) {
  await Promise.all(
    imagePaths.map(async (imagePath) => {
      const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath
      const fullPath = path.join(process.cwd(), 'public', cleanPath.replace(/^uploads\//, 'uploads/'))
      try {
        await fs.unlink(fullPath)
      } catch {
        return
      }
    })
  )
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)

  try {
    await connectDB()
    const searchParams = request.nextUrl.searchParams

    const category = searchParams.get('category')
    const subcategory = searchParams.get('subcategory')
    const location = searchParams.get('location')
    const condition = searchParams.get('condition')
    const minPriceRaw = searchParams.get('minPrice')
    const maxPriceRaw = searchParams.get('maxPrice')
    const searchRaw = searchParams.get('search')
    const sellerParam = searchParams.get('seller')?.trim().toLowerCase()
    const sellerMe = sellerParam === 'me'
    const requestedStatus = searchParams.get('status')?.trim().toLowerCase() || 'active'
    const stateRaw = searchParams.get('state')?.trim().toLowerCase() || null
    const sortRaw = searchParams.get('sort')
    const includeTotal = searchParams.get('includeTotal') !== 'false'

    const page = parseInteger(searchParams.get('page'), 1, 1, 1_000_000)
    const limit = parseInteger(searchParams.get('limit'), 20, 1, MAX_PAGE_SIZE)
    const minPrice = parsePrice(minPriceRaw)
    const maxPrice = parsePrice(maxPriceRaw)
    const search = searchRaw?.trim() || null
    const cursor = searchParams.get('cursor')

    if (page === null || limit === null) {
      return ApiErrors.badRequest('Invalid pagination values for page or limit')
    }
    if (page > 1 && !cursor) {
      return ApiErrors.badRequest('Cursor-based pagination is required. Provide cursor for pages after the first page')
    }
    if (Number.isNaN(minPrice) || Number.isNaN(maxPrice)) {
      return ApiErrors.badRequest('minPrice and maxPrice must be valid non-negative numbers')
    }
    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
      return ApiErrors.badRequest('minPrice cannot be greater than maxPrice')
    }
    if (location && location.trim().length > MAX_FILTER_LENGTH) {
      return ApiErrors.badRequest('Location filter is too long (maximum 100 characters)')
    }
    if (search && search.length > MAX_FILTER_LENGTH) {
      return ApiErrors.badRequest('Search term is too long (maximum 100 characters)')
    }
    if (sortRaw && sortRaw.length > MAX_SORT_LENGTH) {
      return ApiErrors.badRequest('Sort configuration is too long')
    }
    if (stateRaw && stateRaw !== '!=deleted') {
      return ApiErrors.badRequest('Invalid state filter. Allowed value: state=!=deleted')
    }

    const sort = sortRaw?.trim() || null
    const stateFilter: '!=deleted' | null = stateRaw === '!=deleted' ? '!=deleted' : null
    const status = ['active', 'sold', 'pending', 'deleted', 'all'].includes(requestedStatus)
      ? (requestedStatus as 'active' | 'sold' | 'pending' | 'deleted' | 'all')
      : 'active'

    let sellerId: string | null = null

    if (sellerMe) {
      const user = await getAuthUser(request)
      if (!user) {
        return ApiErrors.unauthorized()
      }
      sellerId = String((user as any)._id)
    }

    const queryParams: ListingQueryParams = {
      category,
      subcategory,
      location,
      condition,
      minPrice,
      maxPrice,
      search,
      sort,
      includeTotal,
      limit,
      cursor,
      sellerId,
      status,
      stateFilter,
    }

    const resultData = await fetchListingsData(queryParams)

    logger.debug(
      'Listings fetched',
      { count: resultData.listings.length, limit: resultData.limit, hasMore: resultData.hasMore },
      requestId
    )

    const response = successResponse(resultData)

    response.headers.set('Cache-Control', 'private, no-store')
    response.headers.set('Vary', 'Cookie')
    
    return response
  } catch (error: any) {
    logger.error('Error fetching listings', error, { endpoint: '/api/listings' }, requestId)
    return ApiErrors.serverError()
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request)

  try {
    await connectDB()

    const rateLimitResponse = await applyPersistentRateLimit(request)
    if (rateLimitResponse) {
      logger.warn('Rate limit exceeded on listing creation', {}, requestId)
      return rateLimitResponse
    }

    const user = await getAuthUser(request)
    if (!user) {
      return ApiErrors.unauthorized()
    }

    const u = user as any
    if (u.banned) {
      return errorResponse(
        'Your account has been banned from listing items.',
        403,
        'ACCOUNT_BANNED'
      )
    }
    if (!u.sellerVerified) {
      return errorResponse(
        'You must be a verified seller to list items. Upload your government-issued ID in your profile first.',
        403,
        'VERIFICATION_REQUIRED'
      )
    }

    const formData = await request.formData()

    const title = safeText(formData.get('title'), 120)
    const description = safeText(formData.get('description'), MAX_TEXT_LENGTH)
    const category = safeText(formData.get('category'), 80)
    const location = safeText(formData.get('location'), MAX_FILTER_LENGTH)
    const subcategoryRaw = formData.get('subcategory')
    const subcategory = typeof subcategoryRaw === 'string' && subcategoryRaw.trim()
      ? subcategoryRaw.trim().slice(0, 80)
      : undefined
    const conditionRaw = formData.get('condition')
    const condition = typeof conditionRaw === 'string' ? conditionRaw : ''
    const normalizedCondition = normalizeCondition(condition)
    const priceRaw = formData.get('price')
    const price = typeof priceRaw === 'string' ? Number.parseFloat(priceRaw) : Number.NaN

    if (!title || !description || !category || !location) {
      return ApiErrors.badRequest('title, description, category, and location are required strings')
    }
    if (!Number.isFinite(price) || Number.isNaN(price) || price < 0) {
      return ApiErrors.badRequest('price must be a valid non-negative number')
    }

    const validation = validateCreateListingForm({
      title,
      description,
      price,
      category,
      condition: normalizedCondition,
      location,
    })

    if (!validation.valid) {
      return ApiErrors.validationError(validation.errors)
    }

    const productId = new mongoose.Types.ObjectId()
    const images = await handleImageUpload(formData, user._id.toString(), productId.toString())

    if (!Array.isArray(images) || images.length === 0) {
      return ApiErrors.badRequest('At least one image is required')
    }

    try {
      await Product.create({
        _id: productId,
        title,
        description,
        category,
        subcategory,
        condition: normalizedCondition,
        price,
        location,
        images,
        seller: user._id,
      })
    } catch (dbError) {
      await cleanupUploadedImages(images)
      throw dbError
    }

    const product = await Product.findById(productId).populate('seller', 'name avatar').exec()
    if (!product) {
      await cleanupUploadedImages(images)
      return ApiErrors.serverError()
    }

    revalidateTag('listings', 'max')

    logger.info('Listing created successfully', { listingId: product._id, userId: user._id }, requestId)

    return successResponse({ listing: sanitizeListing(product.toObject()) }, 'Listing created successfully', 201)
  } catch (error: any) {
    logger.error('Error creating listing', error, { endpoint: '/api/listings' }, requestId)

    if (error.name === 'ValidationError') {
      const errors: Record<string, string> = {}
      Object.keys(error.errors).forEach((field) => {
        errors[field] = error.errors[field].message
      })
      return ApiErrors.validationError(errors)
    }

    if (error instanceof Error) {
      const message = error.message || ''
      const uploadErrors = [
        'Invalid file type',
        'File size exceeds',
        'File content does not match',
        'You can upload up to',
        'Total image size is too large',
      ]
      if (uploadErrors.some((fragment) => message.includes(fragment))) {
        return ApiErrors.badRequest(message)
      }
    }

    return ApiErrors.serverError()
  }
}

