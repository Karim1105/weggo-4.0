import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Product from '@/models/Product'
import { requireAdmin } from '@/lib/auth'
import { clearCacheByPrefix } from '@/lib/cache'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// DELETE /api/admin/listings/[id] - Admin delete a listing
async function handler(
  request: NextRequest,
  admin: any,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await context.params
    await connectDB()

    const product = await Product.findById(listingId)
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Listing not found' },
        { status: 404 }
      )
    }

    // Soft-delete the product by setting status='deleted' and expiresAt to 30 days
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    product.status = 'deleted'
    ;(product as any).expiresAt = expiresAt
    await product.save()

    // Clear cache
    clearCacheByPrefix('listings')
    clearCacheByPrefix('seller_')
    clearCacheByPrefix('admin_analytics')

    return NextResponse.json({
      success: true,
      message: 'Listing deleted successfully',
    })
  } catch (error: any) {
    console.error('Error deleting listing:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete listing' },
      { status: 500 }
    )
  }
}

export const DELETE = requireAdmin(handler)
