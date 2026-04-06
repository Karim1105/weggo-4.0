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

    // Delete all listings
    const result = await Product.deleteMany({
      _id: { $in: listingIds },
    })

    // Clear cache
    clearCacheByPrefix('listings')
    clearCacheByPrefix('seller_')
    clearCacheByPrefix('admin_analytics')

    return NextResponse.json({
      success: true,
      message: `${result.deletedCount} listing(s) deleted successfully`,
      deletedCount: result.deletedCount,
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
