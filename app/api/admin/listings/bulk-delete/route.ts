import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Product from '@/models/Product'
import { requireAdmin } from '@/lib/auth'
import { clearCacheByPrefix } from '@/lib/cache'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// POST /api/admin/listings/bulk-delete - Admin bulk delete listings
async function handler(request: NextRequest, admin: any) {
  try {
    if (request.method !== 'POST') {
      return NextResponse.json(
        { success: false, error: 'Method not allowed' },
        { status: 405 }
      )
    }

    const body = await request.json()
    const { listingIds } = body

    if (!Array.isArray(listingIds) || listingIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid listingIds provided' },
        { status: 400 }
      )
    }

    await connectDB()

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    // Soft-delete listings to align with the rest of moderation flows.
    const result = await Product.updateMany(
      {
        _id: { $in: listingIds },
        status: { $ne: 'deleted' },
      },
      {
        $set: {
          status: 'deleted',
          expiresAt,
        },
      }
    )

    // Clear cache
    clearCacheByPrefix('listings')
    clearCacheByPrefix('seller_')
    clearCacheByPrefix('admin_analytics')

    return NextResponse.json({
      success: true,
      message: `${result.modifiedCount} listing(s) deleted successfully`,
      deletedCount: result.modifiedCount,
    })
  } catch (error: any) {
    console.error('Error bulk deleting listings:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete listings' },
      { status: 500 }
    )
  }
}

export const POST = requireAdmin(handler)
