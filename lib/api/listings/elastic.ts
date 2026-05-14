import { elasticClient } from '@/lib/elastic'
import { encodeCursor, decodeCursor, getSortConfigFromFrontend } from '@/lib/api/listings/cursor'
import { ElasticListingDocument } from '@/lib/api/listings/elastic-document'
import { ListingQueryParams, ListingsResult, SanitizedListing, SortField } from './types'

type ElasticClause = Record<string, unknown>

export interface ElasticListingsSearchRequest {
  index: string
  size: number
  query: {
    bool: {
      filter: ElasticClause[]
      must?: ElasticClause[]
    }
  }
  sort: Array<Record<string, unknown>>
  search_after?: Array<string | number>
  track_total_hits: boolean
}

interface ElasticSearchHit {
  _id: string
  _source: ElasticListingDocument
  sort?: Array<string | number>
}

function escapeElasticWildcard(value: string): string {
  return value.replace(/[\\*?"]/g, '\\$&')
}

function buildLocationFilter(location: string): ElasticClause {
  return {
    wildcard: {
      locationKeyword: {
        value: `*${escapeElasticWildcard(location.toLowerCase())}*`,
      },
    },
  }
}

function buildSearchClause(searchTerm: string): ElasticClause {
  return {
    bool: {
      should: [
        {
          multi_match: {
            query: searchTerm,
            type: 'phrase',
            fields: ['title^8', 'seller.name^4', 'categoryText^4', 'subcategoryText^4', 'location^3'],
          },
        },
        {
          multi_match: {
            query: searchTerm,
            type: 'best_fields',
            fields: ['title^5', 'description^2', 'seller.name^3', 'location^2', 'categoryText^2', 'subcategoryText^2'],
            operator: 'and',
          },
        },
        {
          multi_match: {
            query: searchTerm,
            type: 'best_fields',
            fields: ['title^4', 'description', 'seller.name^2', 'location^2', 'categoryText^2', 'subcategoryText^2'],
            fuzziness: 'AUTO',
            prefix_length: 1,
          },
        },
      ],
      minimum_should_match: 1,
    },
  }
}

function buildVisibilityFilters(params: ListingQueryParams): ElasticClause[] {
  const filters: ElasticClause[] = []
  const isSellerScoped = Boolean(params.sellerId)

  if (isSellerScoped) {
    filters.push({ term: { 'seller._id': params.sellerId } })

    if (params.activeOnly) {
      filters.push({ term: { status: 'active' } })
      return filters
    }

    if (params.stateFilter === '!=deleted') {
      filters.push({
        bool: {
          must_not: [{ term: { status: 'deleted' } }],
        },
      })
      return filters
    }

    if (params.status !== 'all') {
      filters.push({ term: { status: params.status } })
    }

    return filters
  }

  filters.push({ term: { status: 'active' } })
  return filters
}

function getElasticSortKey(field: SortField): string {
  switch (field.key) {
    case 'relevanceScore':
      return '_score'
    case '_id':
      return 'id'
    default:
      return field.key
  }
}

export function buildElasticListingsSearchRequest(params: ListingQueryParams): {
  request: ElasticListingsSearchRequest
  fields: SortField[]
} {
  const searchTerm = params.search?.trim() || ''
  const { sort: mongoSortConfig, fields } = getSortConfigFromFrontend(params.sort, Boolean(searchTerm))
  const decodedCursor = decodeCursor(params.cursor)

  const filters = buildVisibilityFilters(params)

  if (params.category && params.category !== 'all') {
    filters.push({ term: { category: params.category } })
  }

  if (params.subcategory && params.subcategory !== 'all') {
    filters.push({ term: { subcategory: params.subcategory } })
  }

  if (params.condition && params.condition !== 'all') {
    filters.push({ term: { condition: params.condition } })
  }

  if (params.location && params.location.trim()) {
    filters.push(buildLocationFilter(params.location.trim()))
  }

  if (params.minPrice !== null || params.maxPrice !== null) {
    const priceRange: Record<string, number> = {}
    if (params.minPrice !== null) priceRange.gte = params.minPrice
    if (params.maxPrice !== null) priceRange.lte = params.maxPrice
    filters.push({ range: { price: priceRange } })
  }

  const must: ElasticClause[] = []
  if (searchTerm) {
    must.push(buildSearchClause(searchTerm))
  }

  const sort = fields.map((field) => {
    const key = getElasticSortKey(field)
    const order = field.direction === 1 ? 'asc' : 'desc'

    if (key === '_score') {
      return { _score: { order } }
    }

    return { [key]: { order } }
  })

  const request: ElasticListingsSearchRequest = {
    index: 'products',
    size: params.limit + 1,
    query: {
      bool: {
        filter: filters,
        ...(must.length > 0 ? { must } : {}),
      },
    },
    sort,
    track_total_hits: params.includeTotal,
  }

  if (decodedCursor) {
    request.search_after = fields.map((field): string | number => {
      switch (field.key) {
        case '_id':
          return decodedCursor._id
        case 'createdAt':
          return decodedCursor.createdAt
        case 'isBoosted':
          return decodedCursor.isBoosted
        default:
          const numericValue = decodedCursor[field.key]
          return typeof numericValue === 'number' ? numericValue : 0
      }
    })
  }

  return { request, fields }
}

export function mapElasticHitToListing(hit: ElasticSearchHit): SanitizedListing {
  const src = hit._source
  const imagesArr = Array.isArray(src.images)
    ? src.images.filter((img: string) => typeof img === 'string' && !img.startsWith('data:'))
    : []

  const description =
    typeof src.description === 'string' && src.description.length > 200
      ? `${src.description.slice(0, 200)}...`
      : src.description

  return {
    _id: hit._id,
    title: src.title,
    price: src.price,
    category: src.category,
    subcategory: src.subcategory,
    condition: src.condition,
    location: src.location,
    status: src.status,
    createdAt: new Date(src.createdAt),
    images: imagesArr.length ? [imagesArr[0]] : [],
    description,
    isBoosted: Boolean(src.isBoosted),
    seller: src.seller ?? undefined,
  }
}

function buildCursorItemFromHit(hit: ElasticSearchHit, fields: SortField[]): {
  _id: string
  createdAt: string | Date
  isBoosted?: boolean | number
  relevanceScore?: number
  price?: number
  averageRating?: number
  ratingCount?: number
} {
  const item: {
    _id: string
    createdAt: string | Date
    isBoosted?: boolean | number
    relevanceScore?: number
    price?: number
    averageRating?: number
    ratingCount?: number
  } = {
    _id: hit._id,
    createdAt: hit._source.createdAt,
    isBoosted: hit._source.isBoosted ? 1 : 0,
    price: hit._source.price,
    averageRating: hit._source.averageRating,
    ratingCount: hit._source.ratingCount,
  }

  if (Array.isArray(hit.sort)) {
    fields.forEach((field, index) => {
      if (field.key === 'relevanceScore') {
        const value = hit.sort?.[index]
        if (typeof value === 'number') {
          item.relevanceScore = value
        }
      }
    })
  }

  return item
}

export async function searchListingsElastic(params: ListingQueryParams): Promise<ListingsResult> {
  const { request, fields } = buildElasticListingsSearchRequest(params)
  const result = await elasticClient.search(request as any)

  const hits = (result.hits?.hits || []) as ElasticSearchHit[]
  const hasMore = hits.length > params.limit
  const documentsToReturn = hasMore ? hits.slice(0, params.limit) : hits

  const listings = documentsToReturn.map(mapElasticHitToListing)
  const lastItem = documentsToReturn[documentsToReturn.length - 1]
  const nextCursor = hasMore && lastItem ? encodeCursor(buildCursorItemFromHit(lastItem, fields), fields) : null

  let total: number | null = null
  if (params.includeTotal) {
    if (typeof result.hits.total === 'number') {
      total = result.hits.total
    } else if (result.hits.total && typeof result.hits.total === 'object') {
      total = result.hits.total.value
    } else {
      total = 0
    }
  }

  return {
    listings,
    limit: params.limit,
    total,
    totalPages: total !== null ? Math.max(1, Math.ceil(total / params.limit)) : null,
    hasMore,
    nextCursor,
  }
}
