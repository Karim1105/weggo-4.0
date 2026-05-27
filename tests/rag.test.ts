import { describe, it, expect } from 'vitest'
import {
  generateAIResponseWithRAG,
  getSearchContext,
  searchWithFilters,
  searchWithRAG,
} from '@/lib/rag'

describe('rag helpers', () => {
  it('builds a populated default search context', () => {
    const context = getSearchContext()

    expect(context.query).toBe('')
    expect(context.userLocation).toBe('Cairo')
    expect(context.products.length).toBeGreaterThan(0)
    expect(context.userPreferences?.priceRange.max).toBe(1000000)
  })

  it('returns product matches plus category and brand suggestions', () => {
    const context = getSearchContext()
    const result = searchWithRAG('iphone in cairo', context)

    expect(result.products.length).toBeGreaterThan(0)
    expect(result.products.some((product) => product.title.toLowerCase().includes('iphone'))).toBe(true)
    expect(result.categories).toContain('Electronics')
    expect(result.brands).toContain('iPhone')
    expect(result.suggestions.length).toBeGreaterThan(0)
  })

  it('filters retrieval results by category, price, location, and brand', () => {
    const results = searchWithFilters('phone', {
      category: 'electronics',
      minPrice: 14000,
      maxPrice: 16000,
      location: 'cairo',
      brand: 'iphone',
    })

    expect(results.length).toBeGreaterThan(0)
    expect(results.every((product) => product.category === 'electronics')).toBe(true)
    expect(results.every((product) => product.price >= 14000 && product.price <= 16000)).toBe(true)
    expect(results.every((product) => product.location.toLowerCase().includes('cairo'))).toBe(true)
    expect(results.every((product) => product.brand?.toLowerCase() === 'iphone')).toBe(true)
  })

  it('returns a helpful no-results response when nothing matches', () => {
    const context = getSearchContext()
    const response = generateAIResponseWithRAG('zzzxqvplmn', context)

    expect(response).toContain(`I couldn't find any items matching "zzzxqvplmn"`)
    expect(response).toContain('Try searching for:')
    expect(response).toContain('Different keywords')
  })

  it('formats a results response with seller and pricing details', () => {
    const context = getSearchContext()
    const response = generateAIResponseWithRAG('macbook', context)

    expect(response).toContain('MacBook Pro M2 16-inch 2023')
    expect(response).toContain('EGP')
    expect(response).toContain('sales')
    expect(response).toContain('Suggestions')
  })
})
