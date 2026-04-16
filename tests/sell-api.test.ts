import { describe, expect, it } from 'vitest'
import { createListingFormData } from '@/app/sell/api'

describe('sell api helpers', () => {
  it('creates form data with listing fields and image files', () => {
    const payload = {
      title: 'iPhone 13',
      description: 'Great condition with box and charger',
      category: 'electronics',
      subcategory: 'smartphones',
      condition: 'Excellent',
      price: 15000,
      location: 'Cairo',
    }

    const image = new File([new Blob(['image'])], 'photo.jpg', { type: 'image/jpeg' })
    const formData = createListingFormData(payload, [image])

    expect(formData.get('title')).toBe(payload.title)
    expect(formData.get('subcategory')).toBe(payload.subcategory)
    expect(formData.get('price')).toBe(String(payload.price))
    expect(formData.getAll('images')).toHaveLength(1)
  })
})
