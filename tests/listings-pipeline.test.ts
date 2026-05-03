import { describe, expect, it } from 'vitest'
import { buildListingsPipeline } from '@/lib/api/listings/pipeline'
import { ListingQueryParams } from '@/lib/api/listings/types'

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

describe('buildListingsPipeline', () => {
  it('keeps public listing queries restricted to active status', () => {
    const { query } = buildListingsPipeline(
      makeParams({
        status: 'all',
        stateFilter: '!=deleted',
      })
    )

    expect(query).toMatchObject({ status: 'active' })
  })

  it('preserves seller-scoped non-active access', () => {
    const { query } = buildListingsPipeline(
      makeParams({
        sellerId: '507f1f77bcf86cd799439011',
        status: 'all',
        stateFilter: '!=deleted',
      })
    )

    expect(query).toHaveProperty('seller')
    expect(query).toMatchObject({ status: { $ne: 'deleted' } })
  })
})
