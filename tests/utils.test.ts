import { describe, it, expect } from 'vitest'
import { formatPrice, formatDate, truncate, slugify, listingImageUrl, mapApiListingToProduct } from '@/lib/utils'

describe('utils', () => {
  it('formats price', () => {
    expect(formatPrice(1500)).toContain('1,500')
  })

  it('formats date', () => {
    const date = new Date('2024-01-01T00:00:00.000Z')
    expect(formatDate(date)).toBeTruthy()
  })

  it('truncates text', () => {
    expect(truncate('hello world', 5)).toBe('hello...')
  })

  it('slugifies text', () => {
    expect(slugify('Hello World!')).toBe('hello-world')
  })

  it('builds listing image urls', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
    expect(listingImageUrl('/uploads/test.jpg')).toBe('http://localhost:3000/uploads/test.jpg')
    expect(listingImageUrl('http://example.com/x.jpg')).toBe('http://example.com/x.jpg')
  })

  it('maps API listing to ProductCard shape', () => {
    const result = mapApiListingToProduct(
      {
        _id: '1',
        title: 'Item',
        price: 100,
        location: 'Cairo',
        condition: 'Good',
        category: 'electronics',
        createdAt: new Date().toISOString(),
        images: ['/uploads/x.jpg'],
        seller: { name: 'Seller', isVerified: true },
      },
      new Set(['1'])
    )
    expect(result.id).toBe('1')
    expect(result.isFavorite).toBe(true)
  })
})
