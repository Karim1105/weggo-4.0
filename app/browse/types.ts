export interface Product {
  id: string
  title: string
  price: number
  location: string
  condition: string
  image: string
  category: string
  subcategory?: string
  postedAt: string
  isFavorite: boolean
  seller?: {
    name: string
    rating?: number
    totalSales?: number
  }
}

export interface ApiListing {
  _id: string
  title: string
  price: number
  location: string
  condition: string
  category: string
  subcategory?: string
  images?: string[]
  createdAt: string
  seller?: {
    _id?: string
    name?: string
    rating?: number
    totalSales?: number
  }
}

export interface ListingsResponsePayload {
  listings: ApiListing[]
  limit: number
  total: number | null
  totalPages: number | null
  hasMore: boolean
  nextCursor: string | null
}

export const DEFAULT_MIN_PRICE = 0
export const DEFAULT_MAX_PRICE = 1_000_000
export const DEFAULT_SORT = 'newest'

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'rating-high', label: 'Top Rated Sellers' },
]
