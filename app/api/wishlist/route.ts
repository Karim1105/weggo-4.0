import { NextRequest, NextResponse } from 'next/server'
import { isValidObjectId } from 'mongoose'
import connectDB from '@/lib/db'
import Wishlist from '@/models/Wishlist'
import Product from '@/models/Product'
import { requireAuthNotBanned } from '@/lib/auth'
import { parsePagination } from '@/lib/pagination'

async function handler(request: NextRequest, user: any) {
  try {
    await connectDB()

    if (request.method === 'GET') {
      const { searchParams } = new URL(request.url)
      const { page, limit, skip } = parsePagination(searchParams, { limit: 100, maxLimit: 100 })

      const [wishlist, total] = await Promise.all([
        Wishlist.find({ user: user._id })
          .populate('product')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Wishlist.countDocuments({ user: user._id }),
      ])

      const products = wishlist
        .map((w: any) => w.product)
        .filter(Boolean)

      return NextResponse.json({
        success: true,
        wishlist: products,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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

      if (!isValidObjectId(productId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid product ID format' },
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

      try {
        const result = await Wishlist.updateOne(
          { user: user._id, product: productId },
          { $setOnInsert: { user: user._id, product: productId } },
          { upsert: true }
        )

        if (result.upsertedCount === 0) {
          return NextResponse.json({
            success: true,
            message: 'Already in wishlist',
          })
        }
      } catch (error: any) {
        // Unique index race under concurrent requests => treat as already present.
        if (error?.code === 11000) {
          return NextResponse.json({
            success: true,
            message: 'Already in wishlist',
          })
        }
        throw error
      }

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

      if (!isValidObjectId(productId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid product ID format' },
          { status: 400 }
        )
      }

      await Wishlist.deleteOne({ user: user._id, product: productId })

      return NextResponse.json({
        success: true,
        message: 'Removed from wishlist',
      })
    }

    return NextResponse.json(
      { success: false, error: 'Method not allowed' },
      { status: 405 }
    )
  } catch (error: any) {
    const message = process.env.NODE_ENV === 'production'
      ? 'Request failed'
      : error.message || 'Request failed'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

export const GET = requireAuthNotBanned(handler)
export const POST = requireAuthNotBanned(handler)
export const DELETE = requireAuthNotBanned(handler)

