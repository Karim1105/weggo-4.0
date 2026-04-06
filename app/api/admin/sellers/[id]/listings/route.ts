import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Product from '@/models/Product'
import User from '@/models/User'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/admin/sellers/[id]/listings - Get all listings for a seller
async function handler(
  request: NextRequest,
  admin: any,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sellerId } = await context.params
    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status') || 'all' // all, active, sold, pending, deleted

    const skip = (page - 1) * limit

    // Verify seller exists
    const seller = await User.findById(sellerId).select('name email role sellerVerified banned')
    if (!seller) {
      return NextResponse.json(
        { success: false, error: 'Seller not found' },
        { status: 404 }
      )
    }

    // Build query
    const query: any = { seller: seller._id }
    if (status !== 'all') {
      query.status = status
    }

    // Get listings
    const [listings, total] = await Promise.all([
      Product.find(query)
        .select('title price category condition location status views images createdAt updatedAt isBoosted averageRating ratingCount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ])

    return NextResponse.json({
      success: true,
      data: {
        seller: {
          _id: seller._id,
          name: seller.name,
          email: seller.email,
          sellerVerified: seller.sellerVerified,
          banned: seller.banned,
        },
        listings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error) {
    console.error('Error fetching seller listings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch seller listings' },
      { status: 500 }
    )
  }
}

export const GET = requireAdmin(handler)
