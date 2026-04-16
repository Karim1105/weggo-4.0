import { NextRequest, NextResponse } from 'next/server'
import { isValidObjectId } from 'mongoose'
import connectDB from '@/lib/db'
import Product from '@/models/Product'
import ViewHistory from '@/models/ViewHistory'
import { getAuthUser } from '@/lib/auth'
import { normalizeCondition, validateCategory, validateSubcategory } from '@/lib/validators'
import { invalidateMarketplaceDiscoveryCaches } from '@/lib/cache'
import { normalizeCategoryId, normalizeSubcategoryId } from '@/lib/taxonomy'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID format' },
        { status: 400 }
      )
    }

    await connectDB()
    const user = await getAuthUser(request)
    const product = await Product.findById(id)
      .populate('seller', 'name avatar')
      .lean() as any

    if (!product || product.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      )
    }

    // Increment views
    await Product.findByIdAndUpdate(id, { $inc: { views: 1 } })

    // Track view history if user is logged in
    if (user && product?.seller?._id && String(user._id) !== String(product.seller._id)) {
      await ViewHistory.findOneAndUpdate(
        { user: user._id, product: id },
        { viewedAt: new Date() },
        { upsert: true, returnDocument: 'after' }
      )
    }

    // Sanitize product before returning to client - remove internal fields and any data URIs
    const images = Array.isArray(product.images)
      ? product.images.filter((img: string) => typeof img === 'string' && !img.startsWith('data:'))
      : []

    const sanitizedSeller = product.seller ? {
      _id: product.seller._id,
      name: (product.seller as any).name,
      avatar: (product.seller as any).avatar,
    } : undefined

    const { status, views, createdAt, ...rest } = product as any

    const sanitizedProduct = {
      ...rest,
      images,
      seller: sanitizedSeller,
    }

    return NextResponse.json({
      success: true,
      product: sanitizedProduct,
    }, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Vary': 'Cookie'
      }
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID format' },
        { status: 400 }
      )
    }

    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()
    const product = await Product.findById(id)

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

    invalidateMarketplaceDiscoveryCaches()

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid product ID format' },
        { status: 400 }
      )
    }

    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await connectDB()
    const product = await Product.findById(id)

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
      const normalizedCategory = normalizeCategoryId(category)
      const categoryValidation = validateCategory(normalizedCategory)
      if (!categoryValidation.valid) {
        return NextResponse.json(
          { success: false, error: categoryValidation.message },
          { status: 400 }
        )
      }
      product.category = normalizedCategory
      if (product.subcategory) {
        const currentSubcategoryValidation = validateSubcategory(product.category, product.subcategory)
        if (!currentSubcategoryValidation.valid) {
          product.subcategory = undefined
        }
      }
    }

    if (subcategory !== undefined) {
      const normalizedSubcategory = subcategory && typeof subcategory === 'string' ? normalizeSubcategoryId(subcategory) : undefined
      const effectiveCategory = category !== undefined ? product.category : normalizeCategoryId(product.category)
      const subcategoryValidation = validateSubcategory(effectiveCategory, normalizedSubcategory)
      if (!subcategoryValidation.valid) {
        return NextResponse.json(
          { success: false, error: subcategoryValidation.message },
          { status: 400 }
        )
      }
      product.subcategory = normalizedSubcategory || undefined
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

    invalidateMarketplaceDiscoveryCaches()

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
