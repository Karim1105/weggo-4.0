import mongoose, { Document, Schema } from 'mongoose'
import { elasticClient } from '@/lib/elastic'

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
TicketSchema.index({ subject: 'text' }) // Can be removed later once ES text search proves reliable

async function indexTicketInElastic(doc: any) {
  if (!doc) return
  try {
    await elasticClient.index({
      index: 'tickets',
      id: String(doc._id),
      document: {
        userId: String(doc.userId),
        subject: doc.subject,
        status: doc.status,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      }
    })
  } catch (err) {
    console.error('ES Ticket Index Error:', err)
  }
}

TicketSchema.post('save', async function(doc) {
  await indexTicketInElastic(doc)
})

TicketSchema.post('findOneAndUpdate', async function(doc) {
  await indexTicketInElastic(doc)
})

TicketSchema.post('findOneAndDelete', async function(doc) {
  if (!doc) return
  try {
    await elasticClient.delete({
      index: 'tickets',
      id: String(doc._id)
    }).catch(e => {
      if (e.meta?.statusCode !== 404) console.error('ES Ticket Delete Error:', e)
    })
  } catch (err) {
    console.error('ES Ticket Delete Error:', err)
  }
})

export default mongoose.models.Ticket || mongoose.model<ITicket>('Ticket', TicketSchema)
