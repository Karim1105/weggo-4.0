import { PipelineStage } from 'mongoose'

export const MAX_PAGE_SIZE = 100
export const MAX_FILTER_LENGTH = 100
export const MAX_TEXT_LENGTH = 2000
export const MAX_SORT_LENGTH = 120

export const ALLOWED_FRONTEND_SORT_KEYS = new Set([
  'createdAt',
  'price',
  'averageRating',
  'ratingCount',
])

export type SortDirection = 1 | -1

export type ListingStatus = 'active' | 'sold' | 'pending' | 'deleted' | 'all'

export type StateFilter = '!=deleted' | null

export type CursorKey =
  | 'isBoosted'
  | 'relevanceScore'
  | 'price'
  | 'averageRating'
  | 'ratingCount'
  | 'createdAt'
  | '_id'

export interface CursorPayload {
  isBoosted: number
  relevanceScore?: number
  price?: number
  averageRating?: number
  ratingCount?: number
  createdAt: string
  _id: string
}

export interface SortField {
  key: CursorKey
  direction: SortDirection
}

export interface ListingQueryParams {
  category: string | null
  subcategory: string | null
  location: string | null
  condition: string | null
  activeOnly: boolean
  minPrice: number | null
  maxPrice: number | null
  search: string | null
  sort: string | null
  includeTotal: boolean
  page: number
  limit: number
  cursor: string | null
  sellerMe: boolean
  sellerId: string | null
  status: ListingStatus
  stateFilter: StateFilter
}

export interface ListingSeller {
  _id?: string
  name?: string
  avatar?: string
  sellerVerified?: boolean
  averageRating?: number
  totalSales?: number
}

export interface SanitizedListing {
  _id: string
  title: string
  price: number
  category: string
  subcategory?: string
  condition: string
  location: string
  status: string
  createdAt: Date
  seller?: ListingSeller
  images: string[]
  description?: string
}

export interface ListingsResult {
  listings: SanitizedListing[]
  limit: number
  total: number | null
  totalPages: number | null
  hasMore: boolean
  nextCursor: string | null
}

export interface SortConfig {
  sort: Record<string, 1 | -1 | { $meta: 'textScore' }>
  fields: SortField[]
}

export interface ListingsQueryBuildResult {
  pipeline: PipelineStage[]
  query: Record<string, unknown>
  fields: SortField[]
}

export interface CreateListingInput {
  title: string
  description: string
  category: string
  subcategory?: string
  condition: string
  normalizedCondition: string
  location: string
  price: number
}

export interface ListingsAggregateItem {
  _id: string
  title: string
  price: number
  images?: string[]
  category: string
  subcategory?: string
  location: string
  condition: string
  description?: string
  createdAt: Date
  status: string
  seller?: ListingSeller
  isBoosted?: boolean
  relevanceScore?: number
  averageRating?: number
  ratingCount?: number
}
