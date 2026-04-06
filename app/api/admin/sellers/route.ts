import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import Product from '@/models/Product'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function handler(request: NextRequest) {
  try {
    await connectDB()

    // Get all users who have seller-verified status or have created listings
    const sellers = await User.find({
      $or: [
        { sellerVerified: true },
        { role: 'seller' },
      ],
    })
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 })
      .lean()

    // Enrich with listing count
    const sellersWithCounts = await Promise.all(
      sellers.map(async (seller) => {
        const listingCount = await Product.countDocuments({ seller: seller._id })
        return {
          ...seller,
          listingCount,
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        sellers: sellersWithCounts,
      },
    })
  } catch (error) {
    console.error('Error fetching sellers:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sellers' },
      { status: 500 }
    )
  }
}

export const GET = requireAdmin(handler)
