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
      .populate('product', 'category subcategory')
      .lean()

    const viewedProductIds = viewHistory
      .map((entry: any) => {
        if (!entry?.product) return null
        return typeof entry.product === 'object' && entry.product?._id ? entry.product._id : entry.product
      })
      .filter(Boolean)

    const recentCategories = [
      ...new Set(
        viewHistory
          .map((entry: any) =>
            entry?.product && typeof entry.product === 'object' ? entry.product.category : null
          )
          .filter(Boolean)
      ),
    ]

    const recentSubcategories = [
      ...new Set(
        viewHistory
          .map((entry: any) =>
            entry?.product && typeof entry.product === 'object' ? entry.product.subcategory : null
          )
          .filter(Boolean)
      ),
    ]

    // Get user's wishlist categories
    const wishlist = await Wishlist.find({ user: user._id })
      .populate('product', 'category')
      .lean()

    const wishlistCategories = wishlist.map((w: any) => w.product?.category).filter(Boolean)
    const preferredCategories = [...new Set([...wishlistCategories, ...recentCategories])]

    const recommendationOr: any[] = []
    if (preferredCategories.length > 0) {
      recommendationOr.push({ category: { $in: preferredCategories } })
    }
    if (recentSubcategories.length > 0) {
      recommendationOr.push({ subcategory: { $in: recentSubcategories } })
    }

    // Use an anchored regex to improve performance and leverage indexes if possible
    const locationTerm = typeof user.location === 'string' ? user.location.trim() : ''
    if (locationTerm) {
      recommendationOr.push({ location: { $regex: `^${locationTerm}`, $options: 'i' } })
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
    } else {
      // Fallback: recommend most popular active products from other sellers not viewed by the user
      // No additional filter, just sort by views and recency (already handled below)
    }

    const recommendationsRaw = await Product.find(query)
      .select('_id title price images category location condition description subcategory createdAt seller')
      .populate('seller', 'name avatar')
      .sort({ views: -1, createdAt: -1 })
      .limit(12)
      .lean()

    const recommendations = recommendationsRaw.map((product: any) => {
      const imagesArr = Array.isArray(product.images)
        ? product.images.filter((img: string) => typeof img === 'string' && !img.startsWith('data:'))
        : []
      const description = typeof product.description === 'string' && product.description.length > 200
        ? product.description.slice(0, 200) + '...'
        : product.description

      return {
        _id: product._id.toString(),
        title: product.title,
        price: product.price,
        images: imagesArr.length ? [imagesArr[0]] : [],
        category: product.category,
        subcategory: product.subcategory,
        location: product.location,
        condition: product.condition,
        description,
        createdAt: product.createdAt,
        seller: product.seller ? {
          _id: product.seller._id.toString(),
          name: product.seller.name,
          avatar: product.seller.avatar,
        } : null,
      }
    })

    const result = {
      success: true,
      recommendations,
      strategy: recommendationOr.length > 0 ? 'preference-based' : 'popular-fallback',
      signals: {
        wishlistCategories,
        recentCategories,
        recentSubcategories,
        locationMatched: Boolean(locationTerm),
        recentViewCount: viewHistory.length,
      },
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

