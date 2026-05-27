import mongoose, { Document, Schema } from 'mongoose'
import type { ListingSyncOperation } from '@/types/ai'

export interface ISyncOutbox extends Document {
  attempts: number
  createdAt: Date
  lastError?: string
  nextAttemptAt: Date
  op: ListingSyncOperation
  payloadHash: string
  productId: mongoose.Types.ObjectId
  state: 'pending' | 'ready'
  translationFailedAt?: Date | null
  updatedAt: Date
}

const SyncOutboxSchema = new Schema<ISyncOutbox>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      unique: true,
    },
    op: {
      type: String,
      enum: ['upsert', 'delete'],
      required: true,
    },
    state: {
      type: String,
      enum: ['pending', 'ready'],
      default: 'ready',
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    nextAttemptAt: {
      type: Date,
      required: true,
      index: true,
    },
    lastError: {
      type: String,
      default: undefined,
    },
    payloadHash: {
      type: String,
      required: true,
    },
    translationFailedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

SyncOutboxSchema.index({ state: 1, nextAttemptAt: 1 })

export default mongoose.models.SyncOutbox || mongoose.model<ISyncOutbox>('SyncOutbox', SyncOutboxSchema)
