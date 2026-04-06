import mongoose, { Schema, Document } from 'mongoose'

export interface IBanAppeal extends Document {
  userId: mongoose.Types.ObjectId
  bannedBy?: mongoose.Types.ObjectId
  reason: string
  appealMessage: string
  status: 'pending' | 'approved' | 'rejected'
  reviewedBy?: mongoose.Types.ObjectId
  reviewedAt?: Date
  rejectionReason?: string
  createdAt: Date
  updatedAt: Date
}

const BanAppealSchema = new Schema<IBanAppeal>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    bannedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reason: {
      type: String,
      required: [true, 'Ban reason is required'],
    },
    appealMessage: {
      type: String,
      required: [true, 'Appeal message is required'],
      maxlength: [4096, 'Appeal message cannot exceed 4096 characters'],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
      maxlength: [4096, 'Rejection reason cannot exceed 4096 characters'],
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.models.BanAppeal || mongoose.model<IBanAppeal>('BanAppeal', BanAppealSchema)
