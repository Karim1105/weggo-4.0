import mongoose from 'mongoose'
import Product from '@/models/Product'
import { ListingsAggregateItem, SortField } from '@/lib/api/listings/types'
import { PipelineStage } from 'mongoose'

export async function aggregateListings(pipeline: PipelineStage[]): Promise<ListingsAggregateItem[]> {
  return Product.aggregate(pipeline).exec() as Promise<ListingsAggregateItem[]>
}

export async function countListings(query: Record<string, unknown>): Promise<number> {
  return Product.countDocuments(query).exec()
}

export async function createListingDocument(input: {
  productId: mongoose.Types.ObjectId
  title: string
  description: string
  category: string
  subcategory?: string
  condition: string
  price: number
  location: string
  images: string[]
  sellerId: mongoose.Types.ObjectId
}) {
  return Product.create({
    _id: input.productId,
    title: input.title,
    description: input.description,
    category: input.category,
    subcategory: input.subcategory,
    condition: input.condition,
    price: input.price,
    location: input.location,
    images: input.images,
    seller: input.sellerId,
  })
}

export async function findListingByIdWithSeller(productId: mongoose.Types.ObjectId) {
  return Product.findById(productId).populate('seller', 'name avatar').exec()
}

export function getDefaultSortFields(): SortField[] {
  return [
    { key: 'isBoosted', direction: -1 },
    { key: 'createdAt', direction: -1 },
    { key: '_id', direction: -1 },
  ]
}
