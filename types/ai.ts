export type ChatbotRole = 'user' | 'assistant'

export interface ChatbotMessage {
  id: string
  role: ChatbotRole
  content: string
  timestamp: Date
}

export interface AiChatRequestBody {
  message: string
}

export interface AiChatProductSummary {
  title: string
  price: number
  location: string
}

export interface AiChatSuccessResponse {
  success: true
  response: string
  timestamp: string
  degraded?: boolean
}

export interface AiChatErrorResponse {
  success: false
  error: string
}

export type AiChatResponse = AiChatSuccessResponse | AiChatErrorResponse

export interface AiChatStreamReplyEvent {
  type: 'reply'
  response: string
  degraded?: boolean
}

export interface AiChatStreamDoneEvent {
  type: 'done'
}

export interface AiChatStreamErrorEvent {
  type: 'error'
  error: string
}

export type AiChatStreamEvent =
  | AiChatStreamReplyEvent
  | AiChatStreamDoneEvent
  | AiChatStreamErrorEvent

export interface ExtractedChatbotServiceRequest {
  session_id: string
  message: string
}

export interface ExtractedChatbotServiceResponse {
  session_id: string
  reply: string
}

export interface ExtractedChatbotServiceStreamEvent {
  type: 'chunk' | 'reply' | 'done'
  content?: string
  reply?: string
}

export interface ExtractedChatbotServiceErrorResponse {
  error?: string
  detail?: string
}

export interface ExtractedChatbotListingResult {
  listing_id: string
  title: string
  price: string | number
  relevance: 'exact' | 'close'
  match_note?: string
}

export interface ExtractedChatbotStructuredReply {
  has_results: boolean
  results: ExtractedChatbotListingResult[]
  message: string
}

export interface RetrievalSeller {
  id: string
  name: string
  rating: number
  totalSales: number
}

export interface RetrievalProduct {
  id: string
  title: string
  description: string
  price: number
  location: string
  condition: string
  category: string
  subcategory?: string
  brand?: string
  images: string[]
  seller: RetrievalSeller
  postedAt: string
  tags: string[]
}

export interface RetrievalSearchContext {
  products: RetrievalProduct[]
  query: string
  userLocation?: string
  userPreferences?: {
    categories: string[]
    priceRange: { min: number; max: number }
    brands: string[]
  }
}

export interface RetrievalSearchResult {
  products: RetrievalProduct[]
  suggestions: string[]
  categories: string[]
  brands: string[]
}

export interface LanceDbCatalogRecord {
  title: string
  description: string
  category: string
  subcategory?: string
  brand?: string
  condition: string
  observed_condition?: string
  quality_signals?: string | string[]
  authenticity_signals?: string | string[]
  seller_rating?: number
  seller_sales?: number
  embeddingText: string
}

export interface LanceDbSearchFilters {
  category?: string
  minPrice?: number
  maxPrice?: number
  condition?: string
  location?: string
  brand?: string
}

export interface LancedbSellerProfilePayload {
  rating_en?: number | null
  rating_ar?: number | null
}

export interface LancedbListingPayload {
  id: string
  title_en: string
  title_ar: string
  description_en: string
  description_ar: string
  brand_en?: string
  brand_ar?: string
  category_en: string
  category_ar: string
  subcategory_en?: string
  subcategory_ar?: string
  condition_en: string
  condition_ar: string
  price_en?: number | null
  price_ar?: number | null
  sellerProfile?: LancedbSellerProfilePayload
}

export interface LancedbBatchUpsertRequest {
  listings: LancedbListingPayload[]
}

export interface LancedbBatchUpsertResponse {
  upserted: string[]
}

export interface LancedbDeleteResponse {
  deleted: string
}

export interface LancedbSearchRequest {
  query: string
  locale: 'en' | 'ar'
  filters?: LanceDbSearchFilters
  limit?: number
}

export interface LancedbSearchResponse {
  results: string[]
}

export interface LancedbExistsRequest {
  ids: string[]
}

export interface LancedbExistsResponse {
  existing_ids: string[]
}

export interface TranslationServiceListingInput {
  title?: string
  description?: string
  brand?: string
  category?: string
  subcategory?: string
  condition?: string
  price?: number | string
  sellerProfile?: {
    rating?: number | string | null
  }
}

export interface TranslationServiceListingOutput extends TranslationServiceListingInput {
  _sourceLanguage?: 'en' | 'ar'
  _targetLanguage?: 'en' | 'ar'
  title_en?: string
  title_ar?: string
  description_en?: string
  description_ar?: string
  brand_en?: string
  brand_ar?: string
  category_en?: string
  category_ar?: string
  subcategory_en?: string
  subcategory_ar?: string
  condition_en?: string
  condition_ar?: string
}

export type TranslationServiceBatchRequest = TranslationServiceListingInput[]
export type TranslationServiceBatchResponse = TranslationServiceListingOutput[]

export type ListingSyncOperation = 'upsert' | 'delete'
