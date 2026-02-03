import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Wishlist from '@/models/Wishlist'
import Product from '@/models/Product'
import { requireAuth } from '@/lib/auth'

async function handler(request: NextRequest, user: any) {
  await connectDB()

  if (request.method === 'GET') {
    const wishlist = await Wishlist.find({ user: user._id })
      .populate('product')
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({
      success: true,
      wishlist: wishlist.map((w: any) => w.product),
    })
  }

  if (request.method === 'POST') {
    const body = await request.json()
    const { productId } = body

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }

    const product = await Product.findById(productId)
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Use atomic $addToSet to prevent duplicate entries on concurrent requests
    const userWishlist = await Wishlist.findOne({ user: user._id })
    if (userWishlist && userWishlist.product.includes(productId)) {
      return NextResponse.json(
        { success: false, error: 'Already in wishlist' },
        { status: 400 }
      )
    }

    await Wishlist.findOneAndUpdate(
      { user: user._id },
      { $addToSet: { product: productId } },
      { upsert: true, new: true }
    )

    return NextResponse.json({
      success: true,
      message: 'Added to wishlist',
    })
  }

  if (request.method === 'DELETE') {
    const body = await request.json()
    const { productId } = body

    if (!productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Use atomic $pull to safely remove from concurrent requests
    await Wishlist.findOneAndUpdate(
      { user: user._id },
      { $pull: { product: productId } },
      { new: true }
    )

    return NextResponse.json({
      success: true,
      message: 'Removed from wishlist',
    })
  }

  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  )
}

export const GET = requireAuth(handler)
export const POST = requireAuth(handler)
export const DELETE = requireAuth(handler)


