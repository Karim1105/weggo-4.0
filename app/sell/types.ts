import type { CategorizationResult } from '@/lib/categorization'

export interface ListingFormValues {
  title: string
  description: string
  category: string
  subcategory?: string
  condition: string
  price: number
  location: string
}

export interface ListingApiPayload {
  title: string
  description: string
  category: string
  subcategory?: string
  condition: string
  price: number
  location: string
}

export interface ListingResponse {
  success?: boolean
  error?: string
  code?: string
  data?: {
    listing?: {
      _id?: string
    }
  }
  listing?: {
    _id?: string
  }
}

export type AISuggestion = CategorizationResult
