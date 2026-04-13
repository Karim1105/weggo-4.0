import { Types } from 'mongoose'
import connectDB from '@/lib/db'
import Ticket from '@/models/Ticket'
import TicketMessage from '@/models/TicketMessage'

let cleanupInProgress = false
let lastCleanupRun = 0

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000
const TICKET_RETENTION_MS = 15 * 24 * 60 * 60 * 1000

export async function cleanupClosedTickets(force = false) {
  const now = Date.now()
  if (!force && (cleanupInProgress || now - lastCleanupRun < CLEANUP_INTERVAL_MS)) {
    return { deleted: 0, skipped: true }
  }

  cleanupInProgress = true
  lastCleanupRun = now

  try {
    await connectDB()

    const cutoff = new Date(now - TICKET_RETENTION_MS)
    const staleTickets = await Ticket.find({
      status: 'closed',
      closedAt: { $lte: cutoff },
    })
      .select('_id')
      .limit(500)
      .lean<{ _id: Types.ObjectId }[]>()

    if (staleTickets.length === 0) {
      return { deleted: 0, skipped: false }
    }

    const ids = staleTickets.map((item) => item._id)
    await TicketMessage.deleteMany({ ticketId: { $in: ids } })
    const result = await Ticket.deleteMany({ _id: { $in: ids }, status: 'closed', closedAt: { $lte: cutoff } })

    return { deleted: result.deletedCount || 0, skipped: false }
  } finally {
    cleanupInProgress = false
  }
}
