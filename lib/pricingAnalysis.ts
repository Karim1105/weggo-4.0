import connectDB from '@/lib/db'
import Product from '@/models/Product'

export type PricingSource = {
  platform: string
  price: number
  url: string
  title?: string
}

export type PricingResult = {
  price: number
  confidence: number
  reason: string
  marketTrend: 'up' | 'down' | 'stable'
  sources: PricingSource[]
  priceRange: {
    min: number
    max: number
  }
}

export type PricingProgressUpdate = {
  stepId: string
  status: 'pending' | 'running' | 'done' | 'error'
  progress: number
  message?: string
}

const BASE_PRICES: Record<string, number> = {
  electronics: 15000,
  furniture: 8000,
  vehicles: 350000,
  fashion: 500,
  home: 3000,
  sports: 2000,
  books: 150,
  toys: 300,
  music: 5000,
  gaming: 8000
}

const CONDITION_MULTIPLIERS: Record<string, number> = {
  new: 1.0,
  'like-new': 0.85,
  'like new': 0.85,
  good: 0.7,
  fair: 0.5,
  poor: 0.3
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'with', 'of', 'in', 'on', 'at', 'to', 'from',
  'used', 'brand', 'new', 'sale', 'excellent', 'good', 'like', 'condition'
])

function extractKeywords(title: string, description: string): string[] {
  const raw = `${title} ${description || ''}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  const keywords = raw.filter((word) => word.length > 2 && !STOP_WORDS.has(word))
  return Array.from(new Set(keywords)).slice(0, 6)
}

export async function analyzePricing(
  input: {
    title: string
    description: string
    category: string
    condition: string
  },
  onProgress?: (update: PricingProgressUpdate) => void
): Promise<PricingResult> {
  onProgress?.({ stepId: 'prepare', status: 'running', progress: 10, message: 'Preparing input' })

  const basePrice = BASE_PRICES[input.category?.toLowerCase()] || 1000
  const multiplier = CONDITION_MULTIPLIERS[input.condition?.toLowerCase()] || 0.7
  const suggestedPrice = Math.round(basePrice * multiplier)

  await connectDB()

  const keywords = extractKeywords(input.title, input.description)
  onProgress?.({ stepId: 'match', status: 'running', progress: 35, message: 'Finding similar listings' })

  const match: Record<string, any> = {
    status: 'active'
  }
  if (input.category) {
    match.category = input.category
  }
  if (keywords.length > 0) {
    match.title = { $regex: keywords.join('|'), $options: 'i' }
  }

  let similar = await Product.find(match)
    .select('title price location _id')
    .limit(10)
    .lean()

  if (similar.length === 0 && input.category) {
    similar = await Product.find({ status: 'active', category: input.category })
      .select('title price location _id')
      .limit(10)
      .lean()
  }

  onProgress?.({ stepId: 'compute', status: 'running', progress: 70, message: 'Calculating market price' })

  const prices = similar.map((item) => Number(item.price)).filter((p) => Number.isFinite(p) && p > 0)
  const averageMarketPrice = prices.length > 0
    ? Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length)
    : suggestedPrice

  const sources: PricingSource[] = similar.slice(0, 5).map((item) => ({
    platform: 'Weggo Listings',
    price: Number(item.price),
    title: item.title,
    url: `/listings/${item._id}`
  }))

  const confidence = Math.min(95, 55 + Math.min(40, similar.length * 5))

  onProgress?.({ stepId: 'finalize', status: 'done', progress: 100, message: 'Finalizing suggestion' })

  return {
    price: averageMarketPrice,
    confidence,
    reason: `Based on ${similar.length} similar listings in Weggo marketplace, your item's condition, and current market demand.`,
    marketTrend: 'stable',
    sources,
    priceRange: {
      min: Math.round(averageMarketPrice * 0.85),
      max: Math.round(averageMarketPrice * 1.15)
    }
  }
}
