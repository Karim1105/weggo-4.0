import { NextRequest, NextResponse } from 'next/server'
import { isValidObjectId, Types } from 'mongoose'
import connectDB from '@/lib/db'
import Review from '@/models/Review'
import Product from '@/models/Product'
import { requireAuth } from '@/lib/auth'
import { updateProductRating, updateSellerRating } from '@/lib/rating'

async function handler(request: NextRequest, user: any) {
  await connectDB()

  if (request.method === 'GET') {
    const { searchParams } = new URL(request.url)
    const sellerId = searchParams.get('sellerId')

    if (sellerId) {
      // Validate sellerId
      if (!isValidObjectId(sellerId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid seller ID format' },
          { status: 400 }
        )
      }

      // Add pagination
      const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
      const skip = (page - 1) * limit

      // Use MongoDB aggregation for accurate average rating and pagination
      const [result] = await Review.aggregate([
        { $match: { seller: new Types.ObjectId(sellerId) } },
        {
          $facet: {
            stats: [
              {
                $group: {
                  _id: null,
                  averageRating: { $avg: '$rating' },
                  totalReviews: { $sum: 1 },
                },
              },
            ],
            reviews: [
              { $sort: { createdAt: -1 } },
              { $skip: skip },
              { $limit: limit },
              {
                $lookup: {
                  from: 'users',
                  localField: 'reviewer',
                  foreignField: '_id',
                  as: 'reviewer',
                },
              },
              { $unwind: { path: '$reviewer', preserveNullAndEmptyArrays: true } },
              {
                $lookup: {
                  from: 'products',
                  localField: 'product',
                  foreignField: '_id',
                  as: 'product',
                },
              },
              { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
              {
                $project: {
                  rating: 1,
                  comment: 1,
                  createdAt: 1,
                  'reviewer.name': 1,
                  'reviewer.avatar': 1,
                  'product.title': 1,
                  'product.images': 1,
                },
              },
            ],
          },
        },
      ])

      const stats = result?.stats?.[0] || { averageRating: 0, totalReviews: 0 }
      const reviews = result?.reviews || []

      return NextResponse.json({
        success: true,
        reviews,
        averageRating: Math.round(stats.averageRating * 100) / 100,
        totalReviews: stats.totalReviews,
      })
    }

    return NextResponse.json(
      { success: false, error: 'Seller ID is required' },
      { status: 400 }
    )
  }

  if (request.method === 'POST') {
    const body = await request.json()
    const { sellerId, productId, rating, comment } = body

    if (!sellerId || !productId || !rating) {
      return NextResponse.json(
        { success: false, error: 'Seller ID, product ID, and rating are required' },
        { status: 400 }
      )
    }

    // Validate IDs are valid ObjectIds
    if (!isValidObjectId(sellerId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid seller ID format' },
        { status: 400 }
      )
    }

    if (!isValidObjectId(productId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID format' },
        { status: 400 }
      )
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Check if user already reviewed this product
    const existing = await Review.findOne({
      reviewer: user._id,
      product: productId,
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'You have already reviewed this product' },
        { status: 400 }
      )
    }

    // Verify product exists and belongs to seller
    const product = await Product.findById(productId)
    if (!product || product.seller.toString() !== sellerId) {
      return NextResponse.json(
        { success: false, error: 'Invalid product or seller' },
        { status: 400 }
      )
    }

    const review = await Review.create({
      reviewer: user._id,
      seller: sellerId,
      product: productId,
      rating,
      comment,
    })

    await review.populate([
      { path: 'reviewer', select: 'name avatar' },
      { path: 'product', select: 'title images' },
    ])

    // Update product rating automatically
    try {
      await updateProductRating(productId)
      await updateSellerRating(sellerId)
    } catch (error) {
      console.error('Failed to update ratings:', error)
      // Continue even if rating update fails
    }

    return NextResponse.json({
      success: true,
      review,
    })
  }

  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  )
}

export const GET = requireAuth(handler)
export const POST = requireAuth(handler)


