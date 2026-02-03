import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Product from '@/models/Product'
import { requireAdmin } from '@/lib/auth'

// POST /api/admin/listings/[id]/boost - Boost or unboost a listing
async function handler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin(request as any)
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    await connectDB()

    const body = await request.json()
    const { action } = body // action: 'boost' or 'unboost'

    if (!['boost', 'unboost'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be boost or unboost' },
        { status: 400 }
      )
    }

    const listingId = params.id

    const listing = await Product.findById(listingId)
    if (!listing) {
      return NextResponse.json(
        { success: false, error: 'Listing not found' },
        { status: 404 }
      )
    }

    if (action === 'boost') {
      listing.isBoosted = true
      listing.boostedAt = new Date()
      listing.boostedBy = (admin as any)._id
    } else {
      listing.isBoosted = false
      listing.boostedAt = undefined
      listing.boostedBy = undefined
    }

    await listing.save()

    return NextResponse.json({
      success: true,
      message: `Listing ${action === 'boost' ? 'boosted' : 'unboosted'} successfully`,
      data: {
        listingId: listing._id,
        isBoosted: listing.isBoosted,
        boostedAt: listing.boostedAt,
      },
    })
  } catch (error: any) {
    console.error('Boost listing error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update listing boost status' },
      { status: 500 }
    )
  }
}

export const POST = handler
