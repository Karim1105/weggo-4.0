export interface GetListingsParams {
  cursor?: string | null
  limit?: number
  sort?: string
  query?: string | URLSearchParams
  includeTotal?: boolean
}

function normalizeQuery(query?: string | URLSearchParams): URLSearchParams {
  const params = query instanceof URLSearchParams
    ? new URLSearchParams(query)
    : new URLSearchParams(query || '')

  const legacySortBy = params.get('sortBy')
  if (legacySortBy && !params.get('sort')) {
    const map: Record<string, string> = {
      newest: 'createdAt:desc',
      oldest: 'createdAt:asc',
      'price-low': 'price:asc,createdAt:desc',
      'price-high': 'price:desc,createdAt:desc',
      'rating-high': 'averageRating:desc,ratingCount:desc,createdAt:desc',
    }
    params.set('sort', map[legacySortBy] ?? map.newest)
  }

  params.delete('sortBy')
  params.delete('page')
  return params
}

export function getListings({ cursor = null, limit = 20, sort, query, includeTotal = false }: GetListingsParams = {}) {
  const params = normalizeQuery(query)
  params.set('limit', String(limit))
  params.set('includeTotal', String(includeTotal))

  if (sort) {
    params.set('sort', sort)
  }

  if (cursor) {
    params.set('cursor', cursor)
  } else {
    params.delete('cursor')
  }

  return fetch(`/api/listings?${params.toString()}`, { credentials: 'include' })
}
