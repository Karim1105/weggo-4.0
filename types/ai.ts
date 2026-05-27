export type ChatbotRole = 'user' | 'assistant'

export interface ChatbotMessage {
  id: string
  role: ChatbotRole
  content: string
  timestamp: Date
}

export interface AiChatRequestBody {
  message: string
  sessionId?: string
}

export interface AiChatProductSummary {
  title: string
  price: number
  location: string
}

export interface AiChatQueryConfigEntry {
  matcher: (text: string) => boolean
  category: string
  icon: string
  label: string
  keywords: string[]
  fallback: string
}

export interface AiChatSuccessResponse {
  success: true
  response: string
  timestamp: string
}

export interface AiChatErrorResponse {
  success: false
  error: string
}

export type AiChatResponse = AiChatSuccessResponse | AiChatErrorResponse

export interface ExtractedChatbotServiceRequest {
  session_id: string
  message: string
}

export interface ExtractedChatbotServiceResponse {
  session_id: string
  reply: string
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
