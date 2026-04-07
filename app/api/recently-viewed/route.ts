import { NextRequest, NextResponse } from 'next/server'
import { isValidObjectId } from 'mongoose'
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

    if (typeof productId !== 'string' || !isValidObjectId(productId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID format' },
        { status: 400 }
      )
    }

    const product = await Product.findOne({ _id: productId, status: 'active' }).select('_id').lean()
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
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

  const productsRaw = recentViews
    .map((v: any) => v.product)
    .filter((p: any) => p && p.status === 'active')

  const products = productsRaw.map((product: any) => {
    const imagesArr = Array.isArray(product.images)
      ? product.images.filter((img: string) => typeof img === 'string' && !img.startsWith('data:'))
      : []
    const description = typeof product.description === 'string' && product.description.length > 200
      ? product.description.slice(0, 200) + '...'
      : product.description

    return {
      _id: product._id?.toString?.() ?? product._id,
      title: product.title,
      price: product.price,
      images: imagesArr.length ? [imagesArr[0]] : [],
      category: product.category,
      subcategory: product.subcategory,
      location: product.location,
      condition: product.condition,
      description,
      createdAt: product.createdAt,
      seller: product.seller,
    }
  })

  return NextResponse.json({
    success: true,
    products,
  })
}

export const GET = requireAuth(handler)
export const POST = requireAuth(handler)

