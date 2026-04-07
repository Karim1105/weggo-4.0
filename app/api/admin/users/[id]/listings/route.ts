import { NextRequest, NextResponse } from 'next/server'
import { isValidObjectId } from 'mongoose'
import connectDB from '@/lib/db'
import Product from '@/models/Product'
import User from '@/models/User'
import { requireAdmin } from '@/lib/auth'
import { logger, getRequestId } from '@/lib/logger'

// GET /api/admin/users/[id]/listings - Get all listings for a user
async function handler(
  request: NextRequest,
  admin: any,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)

  try {
    const { id: userId } = await context.params
    if (!isValidObjectId(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user ID format' },
        { status: 400 }
      )
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const rawPage = parseInt(searchParams.get('page') || '1')
    const rawLimit = parseInt(searchParams.get('limit') || '20')
    const page = Math.max(1, Number.isNaN(rawPage) ? 1 : rawPage)
    const limit = Math.min(100, Math.max(1, Number.isNaN(rawLimit) ? 20 : rawLimit))
    const status = searchParams.get('status') || 'all' // all, active, sold, pending, deleted

    const skip = (page - 1) * limit

    // Verify user exists
    const user = await User.findById(userId).select('name email role sellerVerified banned averageRating ratingCount totalSales')
    if (!user) {
      logger.warn('Get user listings - user not found', { userId, adminId: admin._id }, requestId)
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Build query
    const query: any = { seller: user._id }
    if (status !== 'all') {
      query.status = status
    }

    // Get listings
    const [listingsRaw, total] = await Promise.all([
      Product.find(query)
        .select('title price category condition location status views images createdAt updatedAt isBoosted averageRating ratingCount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ])

    const listings = listingsRaw.map((listing: any) => ({
      ...listing,
      images: Array.isArray(listing.images)
        ? listing.images
            .filter((img: string) => typeof img === 'string' && !img.startsWith('data:'))
            .slice(0, 1)
        : [],
    }))

    // Get listing statistics
    const stats = await Promise.all([
      Product.countDocuments({ seller: user._id, status: 'active' }),
      Product.countDocuments({ seller: user._id, status: 'sold' }),
      Product.countDocuments({ seller: user._id, status: 'pending' }),
      Product.countDocuments({ seller: user._id, status: 'deleted' }),
      Product.aggregate([
        { $match: { seller: user._id } },
        { $group: { _id: null, totalViews: { $sum: '$views' } } },
      ]),
    ])

    const totalViews = stats[4][0]?.totalViews || 0

    // Get recent reviews for this seller
    const Review = (await import('@/models/Review')).default
    const recentReviews = await Review.find({ seller: user._id })
      .populate('reviewer', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('rating comment createdAt reviewer')
      .lean()

    logger.info(
      'Fetched user listings',
      { userId, listingCount: listings.length, adminId: admin._id },
      requestId
    )

    return NextResponse.json({
      success: true,
      data: {
        seller: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          sellerVerified: user.sellerVerified,
          banned: user.banned,
          averageRating: user.averageRating,
          ratingCount: user.ratingCount,
          totalSales: user.totalSales,
        },
        listings,
        statistics: {
          total,
          active: stats[0],
          sold: stats[1],
          pending: stats[2],
          deleted: stats[3],
          totalViews,
        },
        recentReviews,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error: any) {
    logger.error('Get user listings error', error, { endpoint: '/api/admin/users/[id]/listings' }, requestId)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch user listings' },
      { status: 500 }
    )
  }
}

export const GET = requireAdmin(handler)
