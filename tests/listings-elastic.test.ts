import { describe, expect, it, vi, beforeEach } from 'vitest'
import { buildElasticListingsSearchRequest, searchListingsElastic } from '@/lib/api/listings/elastic'
import { ListingQueryParams } from '@/lib/api/listings/types'

const { searchMock } = vi.hoisted(() => ({
  searchMock: vi.fn(),
}))

vi.mock('@/lib/elastic', () => ({
  elasticClient: {
    search: searchMock,
  },
}))

function makeParams(overrides: Partial<ListingQueryParams> = {}): ListingQueryParams {
  return {
    category: null,
    subcategory: null,
    location: null,
    condition: null,
    activeOnly: false,
    minPrice: null,
    maxPrice: null,
    search: null,
    sort: null,
    includeTotal: true,
    page: 1,
    limit: 20,
    cursor: null,
    sellerMe: false,
    sellerId: null,
    status: 'active',
    stateFilter: null,
    ...overrides,
  }
}

describe('listings elastic search', () => {
  beforeEach(() => {
    searchMock.mockReset()
  })

  it('keeps public browse restricted to active listings', () => {
    const { request } = buildElasticListingsSearchRequest(
      makeParams({
        status: 'all',
        stateFilter: '!=deleted',
      })
    )

    expect(request.query.bool.filter).toContainEqual({ term: { status: 'active' } })
  })

  it('preserves seller scoped state=!=deleted semantics', () => {
    const { request } = buildElasticListingsSearchRequest(
      makeParams({
        sellerId: '507f1f77bcf86cd799439011',
        status: 'all',
        stateFilter: '!=deleted',
      })
    )

    expect(request.query.bool.filter).toContainEqual({ term: { 'seller._id': '507f1f77bcf86cd799439011' } })
    expect(request.query.bool.filter).toContainEqual({
      bool: {
        must_not: [{ term: { status: 'deleted' } }],
      },
    })
  })

  it('accepts normalized frontend sort strings and maps them to deterministic elastic sort order', () => {
    const { request, fields } = buildElasticListingsSearchRequest(
      makeParams({
        sort: 'price:asc,createdAt:desc',
      })
    )

    expect(fields.map((field) => field.key)).toEqual(['isBoosted', 'price', 'createdAt', '_id'])
    expect(request.sort).toEqual([
      { isBoosted: { order: 'desc' } },
      { price: { order: 'asc' } },
      { createdAt: { order: 'desc' } },
      { id: { order: 'desc' } },
    ])
  })

  it('builds boosted full text search without changing the cursor contract', () => {
    const { request, fields } = buildElasticListingsSearchRequest(
      makeParams({
        search: 'iphone cairo',
      })
    )

    expect(fields.map((field) => field.key)).toEqual(['isBoosted', 'relevanceScore', 'createdAt', '_id'])
    expect(request.query.bool.must).toHaveLength(1)
    expect(request.sort).toEqual([
      { isBoosted: { order: 'desc' } },
      { _score: { order: 'desc' } },
      { createdAt: { order: 'desc' } },
      { id: { order: 'desc' } },
    ])
  })

  it('translates opaque cursor payloads into elastic search_after values', () => {
    const cursor = Buffer.from(
      JSON.stringify({
        _id: '507f1f77bcf86cd799439011',
        createdAt: '2026-05-12T10:00:00.000Z',
        isBoosted: 1,
        price: 1500,
      })
    ).toString('base64url')

    const { request } = buildElasticListingsSearchRequest(
      makeParams({
        sort: 'price:asc,createdAt:desc',
        cursor,
      })
    )

    expect(request.search_after).toEqual([1, 1500, '2026-05-12T10:00:00.000Z', '507f1f77bcf86cd799439011'])
  })

  it('maps search results and returns stable nextCursor values', async () => {
    searchMock.mockResolvedValue({
      hits: {
        total: { value: 2 },
        hits: [
          {
            _id: '507f1f77bcf86cd799439011',
            _source: {
              id: '507f1f77bcf86cd799439011',
              title: 'iPhone 15',
              description: 'A'.repeat(250),
              category: 'electronics',
              categoryText: 'electronics',
              subcategory: 'phones',
              subcategoryText: 'phones',
              condition: 'Good',
              price: 20000,
              location: 'Cairo',
              locationKeyword: 'cairo',
              status: 'active',
              createdAt: new Date('2026-05-12T10:00:00.000Z'),
              isBoosted: true,
              images: ['/uploads/1.jpg'],
              averageRating: 4.7,
              ratingCount: 9,
              seller: {
                _id: '507f1f77bcf86cd799439099',
                name: 'Seller',
              },
            },
            sort: [1, 20000, '2026-05-12T10:00:00.000Z', '507f1f77bcf86cd799439011'],
          },
          {
            _id: '507f1f77bcf86cd799439012',
            _source: {
              id: '507f1f77bcf86cd799439012',
              title: 'Samsung S24',
              description: 'Second',
              category: 'electronics',
              categoryText: 'electronics',
              subcategory: 'phones',
              subcategoryText: 'phones',
              condition: 'Good',
              price: 19000,
              location: 'Giza',
              locationKeyword: 'giza',
              status: 'active',
              createdAt: new Date('2026-05-11T10:00:00.000Z'),
              isBoosted: false,
              images: ['/uploads/2.jpg'],
              averageRating: 4.1,
              ratingCount: 4,
              seller: null,
            },
            sort: [0, 19000, '2026-05-11T10:00:00.000Z', '507f1f77bcf86cd799439012'],
          },
        ],
      },
    })

    const result = await searchListingsElastic(
      makeParams({
        sort: 'price:asc,createdAt:desc',
        limit: 1,
      })
    )

    expect(searchMock).toHaveBeenCalledOnce()
    expect(result.listings).toHaveLength(1)
    expect(result.listings[0].title).toBe('iPhone 15')
    expect(result.listings[0].description).toHaveLength(203)
    expect(result.hasMore).toBe(true)
    expect(result.total).toBe(2)
    expect(result.totalPages).toBe(2)
    expect(result.nextCursor).toBeTruthy()
  })
})
