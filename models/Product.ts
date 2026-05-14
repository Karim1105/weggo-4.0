import mongoose, { Schema, Document } from 'mongoose'

export interface IProduct extends Document {
  title: string
  description: string
  price: number
  category: string
  subcategory?: string
  condition: string
  location: string
  images: string[]
  seller: mongoose.Types.ObjectId
  // Status values:
  // 'active' - Published and available for purchase
  // 'pending' - Awaiting seller verification or admin approval before publishing
  // 'sold' - Transaction completed, no longer available
  // 'deleted' - Soft-deleted by seller (hidden from listings but data retained)
  status: 'active' | 'sold' | 'pending' | 'deleted'
  views: number
  isBoosted: boolean
  boostedAt?: Date
  boostedBy?: mongoose.Types.ObjectId
  averageRating: number
  ratingCount: number
  lastInquiry?: Date
  expiresAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

const ProductSchema = new Schema<IProduct>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
    },
    subcategory: { type: String, trim: true },
    condition: {
      type: String,
      required: [true, 'Condition is required'],
      enum: ['New', 'Like New', 'Excellent', 'Good', 'Fair', 'Poor'],
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
    },
    images: {
      type: [String],
      default: [],
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'sold', 'pending', 'deleted'],
        message: 'Product status must be one of: active, sold, pending, or deleted'
      },
      default: 'active',
    },
    views: {
      type: Number,
      default: 0,
    },
    isBoosted: {
      type: Boolean,
      default: false,
    },
    boostedAt: {
      type: Date,
    },
    boostedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    lastInquiry: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

ProductSchema.index({ title: 'text', description: 'text' })
ProductSchema.index({ category: 1, location: 1, price: 1 })
ProductSchema.index({ seller: 1 })
ProductSchema.index({ createdAt: -1 })
ProductSchema.index({ status: 1 })
ProductSchema.index({ isBoosted: -1 })
ProductSchema.index({ condition: 1 })
ProductSchema.index({ subcategory: 1 })
ProductSchema.index({ status: 1, isBoosted: -1, createdAt: -1 })
ProductSchema.index({ status: 1, category: 1, isBoosted: -1, createdAt: -1 })
ProductSchema.index({ status: 1, subcategory: 1, isBoosted: -1, createdAt: -1 })
ProductSchema.index({ status: 1, condition: 1, isBoosted: -1, createdAt: -1 })
ProductSchema.index({ status: 1, seller: 1, createdAt: -1 })
ProductSchema.index({ status: 1, views: -1, createdAt: -1 })
ProductSchema.index({ status: 1, averageRating: -1, ratingCount: -1, createdAt: -1 })
// TTL index: documents with a non-null `expiresAt` will be removed by MongoDB
// once the `expiresAt` time is reached. expireAfterSeconds: 0 means expire at the
// time specified in the field.
ProductSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema)


