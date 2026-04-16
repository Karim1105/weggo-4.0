import { NextRequest, NextResponse } from 'next/server'
import { isValidObjectId } from 'mongoose'
import connectDB from '@/lib/db'
import Product from '@/models/Product'
import { requireAdmin } from '@/lib/auth'
import { invalidateMarketplaceDiscoveryCaches } from '@/lib/cache'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function resolveProduct(listingId: string) {
  if (!isValidObjectId(listingId)) return { error: 'Invalid listing ID format', status: 400 as const }

  await connectDB()
  const product = await Product.findById(listingId)
  if (!product) return { error: 'Listing not found', status: 404 as const }

  return { product }
}

// DELETE /api/admin/listings/[id] - Admin delete a listing
async function handler(
  request: NextRequest,
  admin: any,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await context.params
    const resolved = await resolveProduct(listingId)
    if ('error' in resolved) {
      return NextResponse.json(
        { success: false, error: resolved.error },
        { status: resolved.status }
      )
    }
    const { product } = resolved

    // Soft-delete the product by setting status='deleted' and expiresAt to 30 days
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    product.status = 'deleted'
    ;(product as any).expiresAt = expiresAt
    await product.save()

    // Clear cache
    invalidateMarketplaceDiscoveryCaches()

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

// PATCH /api/admin/listings/[id] - Admin toggle listing visibility
async function patchHandler(
  request: NextRequest,
  admin: any,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await context.params
    const resolved = await resolveProduct(listingId)
    if ('error' in resolved) {
      return NextResponse.json(
        { success: false, error: resolved.error },
        { status: resolved.status }
      )
    }

    const { product } = resolved
    const body = await request.json().catch(() => null)
    const visible = body?.visible

    if (typeof visible !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'visible must be a boolean' },
        { status: 400 }
      )
    }

    if (!['active', 'deleted'].includes(product.status)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Visibility can only be changed for active or hidden listings',
        },
        { status: 409 }
      )
    }

    product.status = visible ? 'active' : 'deleted'
    ;(product as any).expiresAt = null
    await product.save()

    invalidateMarketplaceDiscoveryCaches()

    return NextResponse.json({
      success: true,
      data: {
        listingId: product._id,
        visible,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update listing visibility' },
      { status: 500 }
    )
  }
}

export const DELETE = requireAdmin(handler)
export const PATCH = requireAdmin(patchHandler)
