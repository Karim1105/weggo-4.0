import { NextRequest, NextResponse } from 'next/server'
import { isValidObjectId } from 'mongoose'
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
    if (!isValidObjectId(sellerId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid seller ID format' },
        { status: 400 }
      )
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const rawPage = parseInt(searchParams.get('page') || '1')
    const rawLimit = parseInt(searchParams.get('limit') || '50')
    const page = Math.max(1, Number.isNaN(rawPage) ? 1 : rawPage)
    const limit = Math.min(100, Math.max(1, Number.isNaN(rawLimit) ? 50 : rawLimit))
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
