import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Product from '@/models/Product'
import ViewHistory from '@/models/ViewHistory'
import { getAuthUser } from '@/lib/auth'
import { normalizeCondition } from '@/lib/validators'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()
    const product = await Product.findById(params.id)
      .populate('seller', 'name email avatar isVerified phone location')
      .lean()

    if (!product || product.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Increment views
    await Product.findByIdAndUpdate(params.id, { $inc: { views: 1 } })

    // Track view history if user is logged in
    const user = await getAuthUser(request)
    if (user && user._id.toString() !== product.seller._id.toString()) {
      await ViewHistory.findOneAndUpdate(
        { user: user._id, product: params.id },
        { viewedAt: new Date() },
        { upsert: true, new: true }
      )
    }

    return NextResponse.json({
      success: true,
      product,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()
    const product = await Product.findById(params.id)

    if (!product || product.status === 'deleted') {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    if (product.seller.toString() !== user._id.toString() && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    product.status = 'deleted'
    await product.save()

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete product' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()
    const product = await Product.findById(params.id)

    if (!product || product.status === 'deleted') {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    if (product.seller.toString() !== user._id.toString() && user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      title,
      description,
      price,
      category,
      subcategory,
      condition,
      location,
    } = body

    // Only update if value is defined AND valid
    if (title !== undefined) {
      const titleValidation = require('@/lib/validators').validateTitle(title)
      if (!titleValidation.valid) {
        return NextResponse.json(
          { success: false, error: titleValidation.message },
          { status: 400 }
        )
      }
      product.title = title.trim()
    }

    if (description !== undefined) {
      if (typeof description !== 'string' || description.trim().length < 10) {
        return NextResponse.json(
          { success: false, error: 'Description must be at least 10 characters' },
          { status: 400 }
        )
      }
      product.description = description.trim()
    }

    if (price !== undefined) {
      const priceValidation = require('@/lib/validators').validatePrice(price)
      if (!priceValidation.valid) {
        return NextResponse.json(
          { success: false, error: priceValidation.message },
          { status: 400 }
        )
      }
      product.price = price
    }

    if (category !== undefined) {
      if (typeof category !== 'string' || category.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Category is required' },
          { status: 400 }
        )
      }
      product.category = category.trim()
    }

    if (subcategory !== undefined) {
      product.subcategory = subcategory && typeof subcategory === 'string' ? subcategory.trim() : undefined
    }

    if (condition !== undefined) {
      const normalizedCondition = normalizeCondition(condition)
      const validConditions = ['New', 'Like New', 'Excellent', 'Good', 'Fair', 'Poor']
      if (!validConditions.includes(normalizedCondition)) {
        return NextResponse.json(
          { success: false, error: 'Invalid condition value' },
          { status: 400 }
        )
      }
      product.condition = normalizedCondition
    }

    if (location !== undefined) {
      if (typeof location !== 'string' || location.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Location is required' },
          { status: 400 }
        )
      }
      product.location = location.trim()
    }

    await product.save()

    return NextResponse.json({
      success: true,
      listing: product,
      message: 'Product updated successfully',
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update product' },
      { status: 500 }
    )
  }
}


