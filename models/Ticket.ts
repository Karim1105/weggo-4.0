import mongoose, { Document, Schema } from 'mongoose'

export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed'

export interface ITicket extends Document {
  userId: mongoose.Types.ObjectId
  subject: string
  status: TicketStatus
  closedAt?: Date | null
  assignedAdminId?: mongoose.Types.ObjectId | null
  unreadByUser: boolean
  unreadByAdmin: boolean
  lastMessageAt: Date
  createdAt: Date
  updatedAt: Date
}

const TicketSchema = new Schema<ITicket>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true, trim: true, maxlength: 180 },
    status: {
      type: String,
      enum: ['open', 'pending', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    closedAt: { type: Date, default: null, index: true },
    assignedAdminId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    unreadByUser: { type: Boolean, default: false },
    unreadByAdmin: { type: Boolean, default: true },
    lastMessageAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
)

TicketSchema.index({ userId: 1, updatedAt: -1 })
TicketSchema.index({ status: 1, updatedAt: -1 })
TicketSchema.index({ subject: 'text' })

export default mongoose.models.Ticket || mongoose.model<ITicket>('Ticket', TicketSchema)
