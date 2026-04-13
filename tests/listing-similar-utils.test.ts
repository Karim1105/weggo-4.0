import { describe, expect, it } from 'vitest'
import { buildSimilarCards } from '@/app/listings/[id]/utils'

describe('listing similar cards utility', () => {
  it('filters out current listing and limits to four cards', () => {
    const favoriteIds = new Set<string>(['2', '4'])
    const listings = [
      { _id: '1', title: 'Current', price: 10, location: 'cairo', condition: 'Good', category: 'electronics', createdAt: new Date().toISOString(), images: [] },
      { _id: '2', title: 'A', price: 20, location: 'cairo', condition: 'Good', category: 'electronics', createdAt: new Date().toISOString(), images: [] },
      { _id: '3', title: 'B', price: 30, location: 'cairo', condition: 'Good', category: 'electronics', createdAt: new Date().toISOString(), images: [] },
      { _id: '4', title: 'C', price: 40, location: 'cairo', condition: 'Good', category: 'electronics', createdAt: new Date().toISOString(), images: [] },
      { _id: '5', title: 'D', price: 50, location: 'cairo', condition: 'Good', category: 'electronics', createdAt: new Date().toISOString(), images: [] },
      { _id: '6', title: 'E', price: 60, location: 'cairo', condition: 'Good', category: 'electronics', createdAt: new Date().toISOString(), images: [] },
    ]

    const cards = buildSimilarCards(listings, '1', favoriteIds)

    expect(cards).toHaveLength(4)
    expect(cards.map((card) => card.id)).not.toContain('1')
    expect(cards.find((card) => card.id === '2')?.isFavorite).toBe(true)
    expect(cards.find((card) => card.id === '3')?.isFavorite).toBe(false)
  })
})
