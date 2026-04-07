import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import ViewHistory from '@/models/ViewHistory'
import Product from '@/models/Product'
import Wishlist from '@/models/Wishlist'
import { getAuthUser } from '@/lib/auth'
import { getCache, setCache } from '@/lib/cache'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const user = await getAuthUser(request)

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check cache
    const cacheKey = `recommendations_${user._id}`
    const cached = getCache(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    // Get user's view history
    const viewHistory = await ViewHistory.find({ user: user._id })
      .sort({ viewedAt: -1 })
      .limit(20)
      .lean()

    const viewedProductIds = viewHistory.map((v) => v.product)

    // Get user's wishlist categories
    const wishlist = await Wishlist.find({ user: user._id })
      .populate('product', 'category')
      .lean()

    const preferredCategories = [
      ...new Set(wishlist.map((w: any) => w.product?.category).filter(Boolean)),
    ]

    const recommendationOr: any[] = []
    if (preferredCategories.length > 0) {
      recommendationOr.push({ category: { $in: preferredCategories } })
    }

    const locationTerm = typeof user.location === 'string' ? user.location.trim() : ''
    if (locationTerm) {
      recommendationOr.push({ location: { $regex: locationTerm, $options: 'i' } })
    }

    // Get recommendations based on:
    // 1. Similar categories from view history
    // 2. Preferred categories from wishlist
    // 3. Popular items in user's location
    const query: any = {
      status: 'active',
      _id: { $nin: viewedProductIds },
      seller: { $ne: user._id },
    }
    if (recommendationOr.length > 0) {
      query.$or = recommendationOr
    }

    const recommendations = await Product.find(query)
      .select('_id title price images category location condition description subcategory createdAt seller')
      .populate('seller', 'name avatar')
      .sort({ views: -1, createdAt: -1 })
      .limit(12)
      .lean()

    const result = {
      success: true,
      recommendations,
    }

    setCache(cacheKey, result, 600) // Cache for 10 minutes

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get recommendations' },
      { status: 500 }
    )
  }
}


