import mongoose, { Document, Schema } from 'mongoose'

export type TicketSenderRole = 'user' | 'admin'

export interface ITicketMessage extends Document {
  ticketId: mongoose.Types.ObjectId
  senderId: mongoose.Types.ObjectId
  senderRole: TicketSenderRole
  message: string
  attachments: string[]
  createdAt: Date
  updatedAt: Date
}

const TicketMessageSchema = new Schema<ITicketMessage>(
  {
    ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['user', 'admin'], required: true },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    attachments: { type: [String], default: [] },
  },
  { timestamps: true }
)

TicketMessageSchema.index({ ticketId: 1, createdAt: 1 })

export default mongoose.models.TicketMessage || mongoose.model<ITicketMessage>('TicketMessage', TicketMessageSchema)
