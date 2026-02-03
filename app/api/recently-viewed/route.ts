import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import ViewHistory from '@/models/ViewHistory'
import Product from '@/models/Product'
import { requireAuth } from '@/lib/auth'

async function handler(request: NextRequest, user: any) {
  await connectDB()

  if (request.method === 'POST') {
    // Add a product to recently viewed (atomic operation to prevent duplicates from concurrent requests)
    const body = await request.json()
    const { productId } = body

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Use atomic $addToSet with upsert to safely track views concurrently
    await ViewHistory.findOneAndUpdate(
      { user: user._id, product: productId },
      { $set: { viewedAt: new Date() } },
      { upsert: true, new: true }
    )

    return NextResponse.json({
      success: true,
      message: 'View tracked',
    })
  }

  // GET recently viewed products
  const recentViews = await ViewHistory.find({ user: user._id })
    .sort({ viewedAt: -1 })
    .limit(20)
    .populate('product')
    .lean()

  const products = recentViews
    .map((v: any) => v.product)
    .filter((p: any) => p && p.status === 'active')

  return NextResponse.json({
    success: true,
    products,
  })
}

export const GET = requireAuth(handler)
export const POST = requireAuth(handler)


