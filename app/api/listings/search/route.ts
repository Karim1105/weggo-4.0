import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { hybridSearchLancedb } from '@/lib/search/lancedb-client'
import Product from '@/models/Product'
import '@/models/User'
import { sanitizeListing } from '@/lib/api/listings/pipeline'

function parseNumber(value: string | null) {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('query')?.trim() || ''
  if (!query) {
    return NextResponse.json(
      { success: false, error: 'query is required' },
      { status: 400 }
    )
  }

  const locale = request.nextUrl.searchParams.get('locale') === 'ar' ? 'ar' : 'en'
  const limit = Math.min(Math.max(parseNumber(request.nextUrl.searchParams.get('limit')) ?? 10, 1), 50)

  try {
    const ids = await hybridSearchLancedb({
      query,
      locale,
      limit,
      filters: {
        category: request.nextUrl.searchParams.get('category') || undefined,
        minPrice: parseNumber(request.nextUrl.searchParams.get('minPrice')),
        maxPrice: parseNumber(request.nextUrl.searchParams.get('maxPrice')),
        condition: request.nextUrl.searchParams.get('condition') || undefined,
      },
    })

    if (ids.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          listings: [],
          total: 0,
        },
      })
    }

    await connectDB()

    const products = await Product.find({
      _id: { $in: ids },
      status: 'active',
    })
      .populate('seller', 'name avatar sellerVerified averageRating totalSales')
      .lean()

    const ordered = ids
      .map((id) => products.find((product) => product._id.toString() === id))
      .filter((product): product is NonNullable<typeof product> => Boolean(product))

    return NextResponse.json({
      success: true,
      data: {
        listings: ordered.map((product) => sanitizeListing(product as any)),
        total: ordered.length,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Search is temporarily unavailable',
      },
      { status: 503 }
    )
  }
}
