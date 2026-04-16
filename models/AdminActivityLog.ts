import mongoose, { Document, Schema } from 'mongoose'

export interface IAdminActivityLog extends Document {
  action: string
  details: string
  actor: string
  createdAt: Date
  updatedAt: Date
}

const AdminActivityLogSchema = new Schema<IAdminActivityLog>(
  {
    action: { type: String, required: true, trim: true, maxlength: 200 },
    details: { type: String, required: true, trim: true, maxlength: 1000 },
    actor: { type: String, required: true, trim: true, maxlength: 200 },
  },
  { timestamps: true }
)

AdminActivityLogSchema.index({ createdAt: -1 })

export default mongoose.models.AdminActivityLog || mongoose.model<IAdminActivityLog>('AdminActivityLog', AdminActivityLogSchema)
