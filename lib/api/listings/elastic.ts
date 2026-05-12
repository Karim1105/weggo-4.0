import { elasticClient } from '@/lib/elastic'
import { ListingQueryParams, SortConfig, SanitizedListing, ListingsResult } from './types'

export async function searchListingsElastic(params: ListingQueryParams): Promise<ListingsResult> {
  const { limit } = params
  const mustFilters: any[] = []
  const filterFilters: any[] = []

  // 1. Basic required status filtering
  const isSellerScoped = Boolean(params.sellerId)

  if (isSellerScoped) {
    filterFilters.push({ term: { 'seller._id': params.sellerId } })
    if (params.status !== 'all') {
      filterFilters.push({ term: { status: params.status } })
    }
  }

  if (isSellerScoped && params.stateFilter === '!=deleted') {
    mustFilters.push({ bool: { must_not: { term: { status: 'deleted' } } } })
  }

  if (params.activeOnly && !isSellerScoped) {
    filterFilters.push({ term: { status: 'active' } })
  } else if (!isSellerScoped) {
    filterFilters.push({ term: { status: 'active' } }) // Default public view requirement
  }

  // 2. Add facets
  if (params.category && params.category !== 'all') {
    filterFilters.push({ term: { category: params.category } })
  }

  if (params.subcategory && params.subcategory !== 'all') {
    filterFilters.push({ term: { subcategory: params.subcategory } })
  }

  if (params.location && params.location.trim() !== '') {
    // using multi_match or match on location text field
    mustFilters.push({
      match: {
        location: {
          query: params.location.trim(),
          fuzziness: 'AUTO'
        }
      }
    })
  }

  if (params.condition && params.condition !== 'all') {
    filterFilters.push({ term: { condition: params.condition } })
  }

  if (params.minPrice !== null || params.maxPrice !== null) {
    const range: any = {}
    if (params.minPrice !== null) range.gte = params.minPrice
    if (params.maxPrice !== null) range.lte = params.maxPrice
    filterFilters.push({ range: { price: range } })
  }

  const searchTerm = params.search?.trim() || ''

  if (searchTerm) {
    mustFilters.push({
      multi_match: {
        query: searchTerm,
        fields: ['title^3', 'description', 'category'],
        fuzziness: 'AUTO'
      }
    })
  }

  const boolQuery: any = {
    filter: filterFilters
  }

  if (mustFilters.length > 0) {
    boolQuery.must = mustFilters
  }

  // 3. Sorting
  const sort: any[] = []
  
  // Custom sorting logic ported from getSortConfigFromFrontend
  const sortParam = params.sort || ''
  
  if (sortParam === 'price-low') {
    sort.push({ price: { order: 'asc' } })
  } else if (sortParam === 'price-high') {
    sort.push({ price: { order: 'desc' } })
  } else if (sortParam === 'rating-high') {
    sort.push({ 'seller.averageRating': { order: 'desc' } })
    sort.push({ 'seller.totalSales': { order: 'desc' } })
  } else if (sortParam === 'newest') {
    sort.push({ createdAt: { order: 'desc' } })
  } else if (sortParam === 'oldest') {
    sort.push({ createdAt: { order: 'asc' } })
  } else if (!searchTerm) {
    // default boosting sort
    sort.push({ isBoosted: { order: 'desc' } })
    sort.push({ createdAt: { order: 'desc' } })
  }

  // tiebreaker
  sort.push({ id: 'desc' })

  if (searchTerm && (!sortParam || sortParam === '')) {
    sort.unshift({ _score: 'desc' })
  }

  // 4. Cursor / search_after
  let searchAfter: any[] | undefined
  if (params.cursor) {
    try {
      const decodedStr = Buffer.from(params.cursor, 'base64').toString('ascii')
      searchAfter = JSON.parse(decodedStr)
    } catch (err) {
       console.error("Invalid base64 cursor:", err)
    }
  }

  const result = await elasticClient.search({
    index: 'products',
    size: limit + 1,
    query: { bool: boolQuery },
    sort: sort as any,
    search_after: searchAfter
  })

  const hits = result.hits.hits
  const hasMore = hits.length > limit
  
  const documentsToReturn = hasMore ? hits.slice(0, limit) : hits
  
  let nextCursor: string | null = null
  if (hasMore && documentsToReturn.length > 0) {
    const lastItem = documentsToReturn[documentsToReturn.length - 1]
    const lastSortValues = lastItem.sort
    if (lastSortValues) {
      nextCursor = Buffer.from(JSON.stringify(lastSortValues)).toString('base64')
    }
  }

  const listings: SanitizedListing[] = documentsToReturn.map((hit: any) => {
    const src = hit._source
    // Construct response matching SanitizeListing structure
    const imagesArr = Array.isArray(src.images)
      ? src.images.filter((img: string) => typeof img === 'string' && !img.startsWith('data:'))
      : []

    const description =
      typeof src.description === 'string' && src.description.length > 200
        ? `${src.description.slice(0, 200)}...`
        : src.description

    return {
      _id: hit._id,
      id: hit._id,
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
      isBoosted: src.isBoosted || false,
      seller: src.seller
    }
  })

  // get count (if includeTotal is true)
  let total = null
  if (params.includeTotal) {
    if (typeof result.hits.total === 'number') {
      total = result.hits.total
    } else if (result.hits.total && typeof result.hits.total === 'object') {
      total = result.hits.total.value
    }
  }

  const totalPages = total !== null ? Math.ceil(total / limit) : null

  return {
    listings,
    limit,
    total,
    totalPages,
    hasMore,
    nextCursor
  }
}