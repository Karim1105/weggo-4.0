import { ApiErrors } from '@/lib/api-response'
import {
  ListingQueryParams,
  ListingStatus,
  MAX_FILTER_LENGTH,
  MAX_PAGE_SIZE,
  MAX_SORT_LENGTH,
  MAX_TEXT_LENGTH,
  StateFilter,
  CreateListingInput,
} from '@/lib/api/listings/types'
import { normalizeCondition } from '@/lib/validators'

interface Ok<T> {
  ok: true
  value: T
}

interface Fail {
  ok: false
  response: ReturnType<typeof ApiErrors.badRequest>
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

function parseStatus(rawStatus: string | null): ListingStatus {
  const normalized = rawStatus?.trim().toLowerCase() || 'active'
  if (['active', 'sold', 'pending', 'deleted', 'all'].includes(normalized)) {
    return normalized as ListingStatus
  }
  return 'active'
}

export function parseListingsQuery(searchParams: URLSearchParams): Ok<ListingQueryParams> | Fail {
  const category = searchParams.get('category')
  const subcategory = searchParams.get('subcategory')
  const location = searchParams.get('location')
  const condition = searchParams.get('condition')
  const minPriceRaw = searchParams.get('minPrice')
  const maxPriceRaw = searchParams.get('maxPrice')
  const searchRaw = searchParams.get('search')
  const sellerParam = searchParams.get('seller')?.trim().toLowerCase()
  const sellerMe = sellerParam === 'me'
  const requestedStatus = searchParams.get('status')
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
    return { ok: false, response: ApiErrors.badRequest('Invalid pagination values for page or limit') }
  }

  if (page > 1 && !cursor) {
    return {
      ok: false,
      response: ApiErrors.badRequest('Cursor-based pagination is required. Provide cursor for pages after the first page'),
    }
  }

  if (Number.isNaN(minPrice) || Number.isNaN(maxPrice)) {
    return { ok: false, response: ApiErrors.badRequest('minPrice and maxPrice must be valid non-negative numbers') }
  }

  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    return { ok: false, response: ApiErrors.badRequest('minPrice cannot be greater than maxPrice') }
  }

  if (location && location.trim().length > MAX_FILTER_LENGTH) {
    return { ok: false, response: ApiErrors.badRequest('Location filter is too long (maximum 100 characters)') }
  }

  if (search && search.length > MAX_FILTER_LENGTH) {
    return { ok: false, response: ApiErrors.badRequest('Search term is too long (maximum 100 characters)') }
  }

  if (sortRaw && sortRaw.length > MAX_SORT_LENGTH) {
    return { ok: false, response: ApiErrors.badRequest('Sort configuration is too long') }
  }

  if (stateRaw && stateRaw !== '!=deleted') {
    return { ok: false, response: ApiErrors.badRequest('Invalid state filter. Allowed value: state=!=deleted') }
  }

  const sort = sortRaw?.trim() || null
  const stateFilter: StateFilter = stateRaw === '!=deleted' ? '!=deleted' : null

  return {
    ok: true,
    value: {
      category,
      subcategory,
      location,
      condition,
      minPrice,
      maxPrice,
      search,
      sort,
      includeTotal,
      page,
      limit,
      cursor,
      sellerMe,
      sellerId: null,
      status: parseStatus(requestedStatus),
      stateFilter,
    },
  }
}

export function parseCreateListingForm(formData: FormData): Ok<CreateListingInput> | Fail {
  const title = safeText(formData.get('title'), 120)
  const description = safeText(formData.get('description'), MAX_TEXT_LENGTH)
  const category = safeText(formData.get('category'), 80)
  const location = safeText(formData.get('location'), MAX_FILTER_LENGTH)

  const subcategoryRaw = formData.get('subcategory')
  const subcategory =
    typeof subcategoryRaw === 'string' && subcategoryRaw.trim()
      ? subcategoryRaw.trim().slice(0, 80)
      : undefined

  const conditionRaw = formData.get('condition')
  const condition = typeof conditionRaw === 'string' ? conditionRaw : ''
  const normalizedCondition = normalizeCondition(condition)

  const priceRaw = formData.get('price')
  const price = typeof priceRaw === 'string' ? Number.parseFloat(priceRaw) : Number.NaN

  if (!title || !description || !category || !location) {
    return {
      ok: false,
      response: ApiErrors.badRequest('title, description, category, and location are required strings'),
    }
  }

  if (!Number.isFinite(price) || Number.isNaN(price) || price < 0) {
    return {
      ok: false,
      response: ApiErrors.badRequest('price must be a valid non-negative number'),
    }
  }

  return {
    ok: true,
    value: {
      title,
      description,
      category,
      subcategory,
      condition,
      normalizedCondition,
      location,
      price,
    },
  }
}

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
