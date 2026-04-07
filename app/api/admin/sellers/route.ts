import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import connectDB from '@/lib/db'
import User from '@/models/User'
import Product from '@/models/Product'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function handler(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const rawPage = parseInt(searchParams.get('page') || '1')
    const rawLimit = parseInt(searchParams.get('limit') || '20')
    const page = Math.max(1, Number.isNaN(rawPage) ? 1 : rawPage)
    const limit = searchParams.has('limit')
      ? Math.min(100, Math.max(1, Number.isNaN(rawLimit) ? 20 : rawLimit))
      : null
    const skip = limit ? (page - 1) * limit : 0

    const listingCounts = await Product.aggregate([
      {
        $group: {
          _id: '$seller',
          listingCount: { $sum: 1 },
        },
      },
    ])

    const sellerIdsWithListings = listingCounts
      .map((entry) => entry._id)
      .filter((id): id is Types.ObjectId => Boolean(id))

    const query: any = sellerIdsWithListings.length > 0
      ? {
          $or: [
            { sellerVerified: true },
            { _id: { $in: sellerIdsWithListings } },
          ],
        }
      : { sellerVerified: true }

    const total = await User.countDocuments(query)

    let sellersQuery = User.find(query)
      .select('name email role sellerVerified banned createdAt')
      .sort({ createdAt: -1 })
      .lean()

    if (limit) {
      sellersQuery = sellersQuery.skip(skip).limit(limit)
    }

    const sellers = await sellersQuery
    const listingCountMap = new Map(
      listingCounts.map((entry) => [String(entry._id), entry.listingCount || 0])
    )
    const sellersWithCounts = sellers.map((seller: any) => ({
      ...seller,
      listingCount: listingCountMap.get(String(seller._id)) || 0,
    }))

    return NextResponse.json({
      success: true,
      data: {
        sellers: sellersWithCounts,
        pagination: {
          page,
          limit: limit ?? total,
          total,
          pages: limit ? Math.max(1, Math.ceil(total / limit)) : 1,
        },
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
