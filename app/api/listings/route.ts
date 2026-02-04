import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Product from '@/models/Product'
import { getAuthUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { getCache, setCache } from '@/lib/cache'
import { handleImageUpload } from '@/lib/imageUpload'
import { successResponse, errorResponse, ApiErrors } from '@/lib/api-response'
import { normalizeCondition, validateCreateListingForm } from '@/lib/validators'
import { logger, getRequestId } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request)

  try {
    await connectDB()
    const searchParams = request.nextUrl.searchParams
    
    const category = searchParams.get('category')
    const subcategory = searchParams.get('subcategory')
    const location = searchParams.get('location')
    const condition = searchParams.get('condition')
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const search = searchParams.get('search')
    const sellerMe = searchParams.get('seller') === 'me'
    const sortBy = searchParams.get('sortBy') || 'newest'
    
    // Validate and sanitize pagination parameters to prevent DoS
    const rawPage = parseInt(searchParams.get('page') || '1')
    const rawLimit = parseInt(searchParams.get('limit') || '20')
    
    const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage)
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 20 : rawLimit), 100) // Max 100 items per page
    const skip = (page - 1) * limit

    // Build query
    const query: any = { status: 'active' }

    if (sellerMe) {
      const user = await getAuthUser(request)
      if (!user) {
        return ApiErrors.unauthorized()
      }
      query.seller = user._id
    }

    if (category && category !== 'all') {
      query.category = category
    }
    if (subcategory && subcategory !== 'all') {
      query.subcategory = subcategory
    }

    if (location) {
      query.location = { $regex: location, $options: 'i' }
    }

    if (minPrice || maxPrice) {
      query.price = {}
      if (minPrice) query.price.$gte = parseInt(minPrice)
      if (maxPrice) query.price.$lte = parseInt(maxPrice)
    }

    // Add condition filter if specified
    if (condition && condition !== 'all') {
      query.condition = condition
    }

    const searchTerm = search?.trim() || ''
    let searchTokens: string[] = []

    if (searchTerm) {
      // Prevent regex DoS by limiting search term length
      if (searchTerm.length > 100) {
        return ApiErrors.badRequest('Search term is too long (maximum 100 characters)')
      }

      searchTokens = tokenizeSearch(searchTerm)
      if (searchTokens.length === 0) {
        searchTokens = [searchTerm]
      }

      const orFilters = buildSearchFilters(searchTokens)
      if (orFilters.length > 0) {
        query.$or = orFilters
      }
    }

    // Build sort - prioritize boosted listings
    let sort: any = {}
    
    // Always sort boosted listings first
    sort.isBoosted = -1
    
    // Then apply secondary sort
    if (sortBy === 'price-low') {
      sort.price = 1
    } else if (sortBy === 'price-high') {
      sort.price = -1
    } else if (sortBy === 'oldest') {
      sort.createdAt = 1
    } else {
      sort.createdAt = -1 // newest
    }

    // Check cache (skip for "my listings")
    const cacheKey = sellerMe
      ? null
      : buildListingsCacheKey({
          category,
          subcategory,
          location,
          condition,
          minPrice,
          maxPrice,
          search,
          sortBy,
          page,
          limit,
        })
    const cached = cacheKey ? getCache(cacheKey) : null
    if (cached) {
      logger.debug('Listings served from cache', { page, limit }, requestId)
      return successResponse(cached)
    }

    const useRelevance = Boolean(searchTerm) && sortBy === 'newest'

    const total = await Product.countDocuments(query)

    let products: any[] = []
    if (useRelevance) {
      const candidateLimit = Math.min(1000, skip + limit + 200)
      const candidates = await Product.find(query)
        .populate('seller', 'name email avatar isVerified')
        .sort({ createdAt: -1 })
        .limit(candidateLimit)
        .lean()

      const scored = candidates.map((item) => ({
        ...item,
        _relevance: calculateRelevance(searchTerm, item.title, item.description)
      }))

      scored.sort((a, b) => {
        if (b._relevance !== a._relevance) return b._relevance - a._relevance
        return new Date((b as any).createdAt ?? 0).getTime() - new Date((a as any).createdAt ?? 0).getTime()
      })

      products = scored.slice(skip, skip + limit)
    } else {
      products = await Product.find(query)
        .populate('seller', 'name email avatar isVerified')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
    }

    const resultData = {
      listings: products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }

    if (cacheKey) {
      setCache(cacheKey, resultData, 300) // Cache for 5 minutes
    }

    logger.debug('Listings fetched', { count: products.length, page, limit }, requestId)

    return successResponse(resultData)
  } catch (error: any) {
    logger.error('Error fetching listings', error, { endpoint: '/api/listings' }, requestId)
    return ApiErrors.serverError()
  }
}

const SEARCH_STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'with', 'of', 'in', 'on', 'at', 'to', 'from',
  'used', 'brand', 'new', 'sale', 'excellent', 'good', 'like', 'condition', 'very',
  'buy', 'sell', 'wanted'
])

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenizeSearch(input: string): string[] {
  const tokens = normalizeText(input)
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token.length >= 2 && !SEARCH_STOP_WORDS.has(token))

  return Array.from(new Set(tokens)).slice(0, 6)
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildSearchFilters(tokens: string[]): any[] {
  const filters: any[] = []
  tokens.forEach((token) => {
    const term = escapeRegex(token)
    filters.push({ title: { $regex: term, $options: 'i' } })
    filters.push({ description: { $regex: term, $options: 'i' } })
  })
  return filters
}

function diceCoefficient(a: string, b: string): number {
  if (!a || !b) return 0
  if (a === b) return 1

  const bigrams = (str: string) => {
    const res: string[] = []
    for (let i = 0; i < str.length - 1; i += 1) {
      res.push(str.slice(i, i + 2))
    }
    return res
  }

  const aBigrams = bigrams(a)
  const bBigrams = bigrams(b)
  const aCounts = new Map<string, number>()

  aBigrams.forEach((g) => aCounts.set(g, (aCounts.get(g) || 0) + 1))

  let matches = 0
  bBigrams.forEach((g) => {
    const count = aCounts.get(g) || 0
    if (count > 0) {
      matches += 1
      aCounts.set(g, count - 1)
    }
  })

  return (2 * matches) / (aBigrams.length + bBigrams.length)
}

function editDistanceOne(a: string, b: string): boolean {
  if (a === b) return true
  const lenA = a.length
  const lenB = b.length
  if (Math.abs(lenA - lenB) > 1) return false

  let i = 0
  let j = 0
  let edits = 0

  while (i < lenA && j < lenB) {
    if (a[i] === b[j]) {
      i += 1
      j += 1
      continue
    }
    edits += 1
    if (edits > 1) return false
    if (lenA > lenB) {
      i += 1
    } else if (lenB > lenA) {
      j += 1
    } else {
      i += 1
      j += 1
    }
  }

  if (i < lenA || j < lenB) edits += 1
  return edits <= 1
}

function calculateRelevance(query: string, title?: string, description?: string): number {
  const queryText = normalizeText(query)
  const fullText = normalizeText(`${title || ''} ${description || ''}`)

  if (!queryText || !fullText) return 0

  const queryTokens = tokenizeSearch(queryText)
  const textTokens = fullText.split(' ').filter(Boolean)
  const textTokenSet = new Set(textTokens)

  let matched = 0
  queryTokens.forEach((token) => {
    if (textTokenSet.has(token)) {
      matched += 1
      return
    }
    const closeMatch = textTokens.some((word) => editDistanceOne(token, word))
    if (closeMatch) matched += 1
  })

  const tokenScore = queryTokens.length ? matched / queryTokens.length : 0
  const diceScore = diceCoefficient(queryText, fullText)

  let score = 0.6 * diceScore + 0.4 * tokenScore

  if (fullText.includes(queryText)) {
    score += 0.2
  }

  return Math.min(1, score)
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request)

  // Rate limiting
  const rateLimitResponse = rateLimit(10, 15 * 60 * 1000)(request)
  if (rateLimitResponse) {
    logger.warn('Rate limit exceeded on listing creation', {}, requestId)
    return rateLimitResponse
  }

  try {
    const user = await getAuthUser(request)
    if (!user) {
      return ApiErrors.unauthorized()
    }

    const u = user as any
    if (u.banned) {
      return ApiErrors.forbidden()
    }
    if (!u.sellerVerified) {
      return errorResponse(
        'You must be a verified seller to list items. Upload your government-issued ID in your profile first.',
        403,
        'VERIFICATION_REQUIRED'
      )
    }

    await connectDB()

    const formData = await request.formData()
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const category = formData.get('category') as string
    const subcategory = (formData.get('subcategory') as string) || undefined
    const condition = formData.get('condition') as string
    const normalizedCondition = normalizeCondition(condition)
    const price = parseFloat(formData.get('price') as string)
    const location = formData.get('location') as string

    // Validate form data
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

    // Handle image upload
    const images = await handleImageUpload(formData, user._id.toString())

    if (images.length === 0) {
      return ApiErrors.badRequest('At least one image is required')
    }

    const product = await Product.create({
      title,
      description,
      category,
      subcategory: subcategory || undefined,
      condition: normalizedCondition,
      price,
      location,
      images,
      seller: user._id,
    })

    await product.populate('seller', 'name email avatar isVerified')

    logger.info('Listing created successfully', { listingId: product._id, userId: user._id }, requestId)

    return successResponse({ listing: product }, 'Listing created successfully', 201)
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

function buildListingsCacheKey(params: {
  category: string | null
  subcategory: string | null
  location: string | null
  condition: string | null
  minPrice: string | null
  maxPrice: string | null
  search: string | null
  sortBy: string
  page: number
  limit: number
}) {
  const safe = (value: string | null) => (value ? encodeURIComponent(value.trim()) : '')
  return [
    'listings',
    safe(params.category),
    safe(params.subcategory),
    safe(params.location),
    safe(params.condition),
    safe(params.minPrice),
    safe(params.maxPrice),
    safe(params.search),
    params.sortBy,
    params.page,
    params.limit,
  ].join('|')
}
