import mongoose, { Document, Schema } from 'mongoose'

export interface IWorkerLease extends Document {
  expiresAt: Date
  holder: string
  name: string
  updatedAt: Date
}

const WorkerLeaseSchema = new Schema<IWorkerLease>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    holder: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
)

export default mongoose.models.WorkerLease || mongoose.model<IWorkerLease>('WorkerLease', WorkerLeaseSchema)
