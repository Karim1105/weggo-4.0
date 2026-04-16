import mongoose, { PipelineStage } from 'mongoose'
import { buildCursorMatch, decodeCursor, getSortConfigFromFrontend } from '@/lib/api/listings/cursor'
import {
  ListingQueryParams,
  ListingsAggregateItem,
  ListingsQueryBuildResult,
  SanitizedListing,
} from '@/lib/api/listings/types'
import { escapeRegex } from '@/lib/api/listings/query'

export function sanitizeListing(product: ListingsAggregateItem): SanitizedListing {
  const imagesArr = Array.isArray(product.images)
    ? product.images.filter((img) => typeof img === 'string' && !img.startsWith('data:'))
    : []

  const description =
    typeof product.description === 'string' && product.description.length > 200
      ? `${product.description.slice(0, 200)}...`
      : product.description

  return {
    _id: String(product._id),
    title: product.title,
    price: product.price,
    category: product.category,
    subcategory: product.subcategory,
    condition: product.condition,
    location: product.location,
    status: product.status,
    createdAt: new Date(product.createdAt),
    seller: product.seller,
    images: imagesArr.length ? [imagesArr[0]] : [],
    description,
  }
}

function buildMatchQuery(params: ListingQueryParams): Record<string, unknown> {
  const query: Record<string, unknown> = { status: 'active' }

  if (params.sellerId) {
    query.seller = new mongoose.Types.ObjectId(params.sellerId)
    if (params.status === 'all') {
      delete query.status
    } else {
      query.status = params.status
    }
  }

  if (params.category && params.category !== 'all') {
    query.category = params.category
  }

  if (params.subcategory && params.subcategory !== 'all') {
    query.subcategory = params.subcategory
  }

  const locationTerm = params.location?.trim() || ''
  if (locationTerm) {
    query.location = { $regex: escapeRegex(locationTerm), $options: 'i' }
  }

  if (params.minPrice !== null || params.maxPrice !== null) {
    const price: Record<string, number> = {}
    if (params.minPrice !== null) price.$gte = params.minPrice
    if (params.maxPrice !== null) price.$lte = params.maxPrice
    query.price = price
  }

  if (params.condition && params.condition !== 'all') {
    query.condition = params.condition
  }

  if (params.stateFilter === '!=deleted') {
    query.status = { $ne: 'deleted' }
  }

  const searchTerm = params.search?.trim() || ''
  if (searchTerm) {
    query.$text = { $search: searchTerm }
  }

  return query
}

export function buildListingsPipeline(params: ListingQueryParams): ListingsQueryBuildResult {
  const query = buildMatchQuery(params)
  const searchTerm = params.search?.trim() || ''
  const useTextScore = Boolean(searchTerm)

  const { sort, fields } = getSortConfigFromFrontend(params.sort, useTextScore)
  const cursor = decodeCursor(params.cursor)

  const pipeline: PipelineStage[] = [{ $match: query }]

  const addFields: Record<string, unknown> = {
    // Normalize older rows that may not have isBoosted persisted yet so
    // boost ordering and cursor pagination use the same effective value.
    isBoosted: { $cond: [{ $eq: ['$isBoosted', true] }, 1, 0] },
  }

  if (useTextScore) {
    addFields.relevanceScore = { $meta: 'textScore' }
  }

  pipeline.push({ $addFields: addFields })

  if (cursor) {
    pipeline.push({ $match: buildCursorMatch(cursor, fields) as PipelineStage.Match['$match'] })
  }

  pipeline.push({ $sort: sort })
  pipeline.push({ $limit: params.limit + 1 })
  pipeline.push(
    {
      $lookup: {
        from: 'users',
        localField: 'seller',
        foreignField: '_id',
        as: 'seller',
        pipeline: [{ $project: { name: 1, avatar: 1, sellerVerified: 1, averageRating: 1, totalSales: 1 } }],
      },
    },
    {
      $unwind: {
        path: '$seller',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        title: 1,
        price: 1,
        images: 1,
        category: 1,
        location: 1,
        condition: 1,
        description: 1,
        subcategory: 1,
        createdAt: 1,
        status: 1,
        seller: 1,
        isBoosted: 1,
        relevanceScore: 1,
        averageRating: 1,
        ratingCount: 1,
      },
    }
  )

  return { pipeline, query, fields }
}
