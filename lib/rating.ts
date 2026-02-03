import Product from '@/models/Product'
import User from '@/models/User'
import Review from '@/models/Review'
import { connectDB } from '@/lib/db'

/**
 * Calculate average rating for a product from its reviews
 */
export async function calculateProductRating(productId: string): Promise<{ average: number; count: number }> {
  await connectDB()

  const reviews = await Review.find({ product: productId }).select('rating').lean()

  if (reviews.length === 0) {
    return { average: 0, count: 0 }
  }

  const total = reviews.reduce((sum, review) => sum + review.rating, 0)
  const average = Math.round((total / reviews.length) * 10) / 10 // Round to 1 decimal

  return { average, count: reviews.length }
}

/**
 * Calculate average rating for a seller from all their product reviews
 */
export async function calculateSellerRating(sellerId: string): Promise<{ average: number; count: number }> {
  await connectDB()

  // Get all products by this seller
  const products = await Product.find({ seller: sellerId }).select('_id').lean()
  const productIds = products.map((p) => p._id)

  if (productIds.length === 0) {
    return { average: 0, count: 0 }
  }

  // Get all reviews for these products
  const reviews = await Review.find({ product: { $in: productIds } }).select('rating').lean()

  if (reviews.length === 0) {
    return { average: 0, count: 0 }
  }

  const total = reviews.reduce((sum, review) => sum + review.rating, 0)
  const average = Math.round((total / reviews.length) * 10) / 10

  return { average, count: reviews.length }
}

/**
 * Update product rating in database
 */
export async function updateProductRating(productId: string): Promise<void> {
  const { average, count } = await calculateProductRating(productId)

  await Product.findByIdAndUpdate(productId, {
    averageRating: average,
    ratingCount: count,
  })
}

/**
 * Update all products' ratings for a seller
 */
export async function updateSellerProductsRatings(sellerId: string): Promise<void> {
  const products = await Product.find({ seller: sellerId }).select('_id')

  for (const product of products) {
    await updateProductRating(product._id.toString())
  }
}

/**
 * Get formatted rating display (e.g., "4.5 (23 reviews)")
 */
export function formatRating(average: number, count: number): string {
  if (count === 0) return 'No ratings yet'
  
  const stars = '★'.repeat(Math.floor(average)) + '☆'.repeat(5 - Math.floor(average))
  return `${stars} ${average} (${count} ${count === 1 ? 'review' : 'reviews'})`
}

/**
 * Get rating category
 */
export function getRatingCategory(average: number): 'excellent' | 'good' | 'fair' | 'poor' | 'none' {
  if (average === 0) return 'none'
  if (average >= 4.5) return 'excellent'
  if (average >= 3.5) return 'good'
  if (average >= 2.5) return 'fair'
  return 'poor'
}

// Legacy mock data and interfaces below (kept for backward compatibility)

export interface Rating {
  id: string
  sellerId: string
  buyerId: string
  productId: string
  rating: number // 1-5 stars
  review: string
  transactionId: string
  createdAt: Date
  helpful: number // number of people who found this helpful
}

export interface SellerStats {
  sellerId: string
  totalRatings: number
  averageRating: number
  totalSales: number
  responseRate: number // percentage of messages responded to
  averageResponseTime: number // in hours
  lastActive: Date
  verified: boolean
  topCategories: string[]
  monthlySales: number
}

export interface RatingBreakdown {
  fiveStar: number
  fourStar: number
  threeStar: number
  twoStar: number
  oneStar: number
}

// Mock ratings database (in production, this would be in your database)
const MOCK_RATINGS: Rating[] = [
  {
    id: 'rating1',
    sellerId: 'seller1',
    buyerId: 'buyer1',
    productId: 'product1',
    rating: 5,
    review: 'Excellent seller! Product exactly as described, fast communication, smooth transaction.',
    transactionId: 'txn1',
    createdAt: new Date('2024-01-15'),
    helpful: 12
  },
  {
    id: 'rating2',
    sellerId: 'seller1',
    buyerId: 'buyer2',
    productId: 'product2',
    rating: 4,
    review: 'Good seller, product was as described. Minor delay in shipping but overall satisfied.',
    transactionId: 'txn2',
    createdAt: new Date('2024-01-20'),
    helpful: 8
  },
  {
    id: 'rating3',
    sellerId: 'seller1',
    buyerId: 'buyer3',
    productId: 'product3',
    rating: 5,
    review: 'Perfect! Highly recommend this seller. Product was in excellent condition.',
    transactionId: 'txn3',
    createdAt: new Date('2024-02-01'),
    helpful: 15
  },
  {
    id: 'rating4',
    sellerId: 'seller2',
    buyerId: 'buyer4',
    productId: 'product4',
    rating: 4,
    review: 'Good experience, seller was responsive and product matched description.',
    transactionId: 'txn4',
    createdAt: new Date('2024-01-25'),
    helpful: 6
  },
  {
    id: 'rating5',
    sellerId: 'seller2',
    buyerId: 'buyer5',
    productId: 'product5',
    rating: 3,
    review: 'Average experience. Product was okay but communication could be better.',
    transactionId: 'txn5',
    createdAt: new Date('2024-02-05'),
    helpful: 3
  }
]

// Calculate weighted seller rating
export function calculateSellerRating(sellerId: string): SellerStats {
  const sellerRatings = MOCK_RATINGS.filter(r => r.sellerId === sellerId)
  
  if (sellerRatings.length === 0) {
    return {
      sellerId,
      totalRatings: 0,
      averageRating: 0,
      totalSales: 0,
      responseRate: 0,
      averageResponseTime: 0,
      lastActive: new Date(),
      verified: false,
      topCategories: [],
      monthlySales: 0
    }
  }
  
  // Calculate weighted average rating
  const totalRating = sellerRatings.reduce((sum, rating) => {
    // Weight recent ratings more heavily
    const daysSinceRating = (Date.now() - rating.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    const weight = Math.max(0.5, 1 - (daysSinceRating / 365)) // Decay over 1 year
    
    return sum + (rating.rating * weight)
  }, 0)
  
  const totalWeight = sellerRatings.reduce((sum, rating) => {
    const daysSinceRating = (Date.now() - rating.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    const weight = Math.max(0.5, 1 - (daysSinceRating / 365))
    return sum + weight
  }, 0)
  
  const averageRating = totalWeight > 0 ? totalRating / totalWeight : 0
  
  // Calculate other stats
  const totalSales = sellerRatings.length
  const responseRate = 85 + Math.random() * 15 // Mock response rate
  const averageResponseTime = 2 + Math.random() * 6 // Mock response time in hours
  
  // Get top categories (mock data)
  const topCategories = ['electronics', 'fashion', 'home']
  
  // Calculate monthly sales
  const currentMonth = new Date().getMonth()
  const monthlySales = sellerRatings.filter(r => 
    r.createdAt.getMonth() === currentMonth
  ).length
  
  return {
    sellerId,
    totalRatings: sellerRatings.length,
    averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
    totalSales,
    responseRate: Math.round(responseRate),
    averageResponseTime: Math.round(averageResponseTime * 10) / 10,
    lastActive: new Date(),
    verified: sellerRatings.length >= 10, // Verified after 10+ sales
    topCategories,
    monthlySales
  }
}

// Get rating breakdown for a seller
export function getRatingBreakdown(sellerId: string): RatingBreakdown {
  const sellerRatings = MOCK_RATINGS.filter(r => r.sellerId === sellerId)
  
  const breakdown = {
    fiveStar: 0,
    fourStar: 0,
    threeStar: 0,
    twoStar: 0,
    oneStar: 0
  }
  
  sellerRatings.forEach(rating => {
    switch (rating.rating) {
      case 5:
        breakdown.fiveStar++
        break
      case 4:
        breakdown.fourStar++
        break
      case 3:
        breakdown.threeStar++
        break
      case 2:
        breakdown.twoStar++
        break
      case 1:
        breakdown.oneStar++
        break
    }
  })
  
  return breakdown
}

// Add new rating
export function addRating(rating: Omit<Rating, 'id' | 'createdAt'>): Rating {
  const newRating: Rating = {
    ...rating,
    id: `rating${Date.now()}`,
    createdAt: new Date()
  }
  
  MOCK_RATINGS.push(newRating)
  
  // In production, this would update the database
  // and trigger a recalculation of seller stats
  
  return newRating
}

// Get recent reviews for a seller
export function getRecentReviews(sellerId: string, limit: number = 5): Rating[] {
  return MOCK_RATINGS
    .filter(r => r.sellerId === sellerId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit)
}

// Get seller performance metrics
export function getSellerPerformance(sellerId: string): {
  rating: SellerStats
  breakdown: RatingBreakdown
  recentReviews: Rating[]
  trends: {
    ratingTrend: 'up' | 'down' | 'stable'
    salesTrend: 'up' | 'down' | 'stable'
  }
} {
  const rating = calculateSellerRating(sellerId)
  const breakdown = getRatingBreakdown(sellerId)
  const recentReviews = getRecentReviews(sellerId, 3)
  
  // Mock trend calculation
  const trends = {
    ratingTrend: 'up' as const, // In production, compare with historical data
    salesTrend: 'up' as const
  }
  
  return {
    rating,
    breakdown,
    recentReviews,
    trends
  }
}

// Search sellers by rating
export function searchSellersByRating(minRating: number = 4.0): SellerStats[] {
  const allSellers = [...new Set(MOCK_RATINGS.map(r => r.sellerId))]
  
  return allSellers
    .map(sellerId => calculateSellerRating(sellerId))
    .filter(seller => seller.averageRating >= minRating)
    .sort((a, b) => b.averageRating - a.averageRating)
}

// Get top-rated sellers
export function getTopRatedSellers(limit: number = 10): SellerStats[] {
  const allSellers = [...new Set(MOCK_RATINGS.map(r => r.sellerId))]
  
  return allSellers
    .map(sellerId => calculateSellerRating(sellerId))
    .filter(seller => seller.totalRatings >= 3) // At least 3 ratings
    .sort((a, b) => b.averageRating - a.averageRating)
    .slice(0, limit)
}

// Calculate trust score for a seller
export function calculateTrustScore(sellerId: string): number {
  const stats = calculateSellerRating(sellerId)
  
  if (stats.totalRatings === 0) return 0
  
  // Trust score factors:
  // - Average rating (40%)
  // - Number of ratings (30%)
  // - Response rate (20%)
  // - Verification status (10%)
  
  const ratingScore = (stats.averageRating / 5) * 40
  const volumeScore = Math.min(stats.totalRatings / 50, 1) * 30 // Max at 50 ratings
  const responseScore = (stats.responseRate / 100) * 20
  const verificationScore = stats.verified ? 10 : 0
  
  return Math.round(ratingScore + volumeScore + responseScore + verificationScore)
}

// Get seller badge based on performance
export function getSellerBadge(sellerId: string): string {
  const trustScore = calculateTrustScore(sellerId)
  const stats = calculateSellerRating(sellerId)
  
  if (trustScore >= 90 && stats.verified) {
    return '🏆 Top Seller'
  } else if (trustScore >= 80) {
    return '⭐ Highly Rated'
  } else if (trustScore >= 70) {
    return '👍 Good Seller'
  } else if (stats.totalRatings >= 5) {
    return '✅ Verified'
  } else {
    return '🆕 New Seller'
  }
}

// Update seller stats when new rating is added
export function updateSellerStats(sellerId: string): void {
  // In production, this would:
  // 1. Recalculate seller stats
  // 2. Update seller profile
  // 3. Send notification to seller
  // 4. Update search rankings
  
  console.log(`Updated stats for seller ${sellerId}`)
}

// Get rating analytics for admin
export function getRatingAnalytics(): {
  totalRatings: number
  averageRating: number
  topSellers: SellerStats[]
  recentActivity: Rating[]
} {
  const totalRatings = MOCK_RATINGS.length
  const averageRating = MOCK_RATINGS.reduce((sum, r) => sum + r.rating, 0) / totalRatings
  const topSellers = getTopRatedSellers(5)
  const recentActivity = MOCK_RATINGS
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10)
  
  return {
    totalRatings,
    averageRating: Math.round(averageRating * 10) / 10,
    topSellers,
    recentActivity
  }
}

export { MOCK_RATINGS }


