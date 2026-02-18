import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Product from '@/models/Product'
import Wishlist from '@/models/Wishlist'
import { getAuthUser } from '@/lib/auth'
import { successResponse, ApiErrors } from '@/lib/api-response'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/listings/trending
 * Get trending listings based on views, recent activity, and engagement
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '12')

    // Get user if authenticated (for wishlist)
    const user = await getAuthUser(request).catch(() => null)

    // Calculate trending score based on:
    // 1. Recent views (weighted heavily)
    // 2. Creation date (newer items get boost)
    // 3. Average rating
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    // Get trending products with high views and recent activity
    const trendingProducts = await Product.find({
      status: 'active',
      $or: [
        { views: { $gte: 10 }, createdAt: { $gte: oneWeekAgo } },
        { views: { $gte: 5 }, createdAt: { $gte: threeDaysAgo } },
        { views: { $gte: 2 }, createdAt: { $gte: oneDayAgo } },
        { averageRating: { $gte: 4.5 }, ratingCount: { $gte: 3 } }
      ]
    })
      .populate('seller', 'name avatar rating totalSales')
      .sort({ views: -1, createdAt: -1, averageRating: -1 })
      .limit(limit)
      .lean()

    // Get user's wishlist if authenticated
    let wishlistIds = new Set<string>()
    if (user) {
      const wishlist = await Wishlist.find({ user: user._id }).select('product').lean()
      wishlistIds = new Set(wishlist.map(w => w.product.toString()))
    }

    // Format response
    const listings = trendingProducts.map((product: any) => ({
      ...product,
      _id: product._id.toString(),
      seller: product.seller ? {
        _id: product.seller._id.toString(),
        name: product.seller.name,
        avatar: product.seller.avatar,
        rating: product.seller.rating,
        totalSales: product.seller.totalSales,
      } : null,
      isFavorite: wishlistIds.has(product._id.toString())
    }))

    return NextResponse.json(successResponse({
      listings,
      total: listings.length,
      algorithm: 'trending'
    }))
  } catch (error: any) {
    logger.error('Get trending listings error:', error)
    return ApiErrors.serverError()
  }
}
