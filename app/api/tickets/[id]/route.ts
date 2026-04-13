import { NextRequest, NextResponse } from 'next/server'
import { isValidObjectId } from 'mongoose'
import connectDB from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import Ticket from '@/models/Ticket'
import TicketMessage from '@/models/TicketMessage'
import { cleanupClosedTickets } from '@/lib/tickets/cleanup'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getHandler(
  request: NextRequest,
  user: any,
  context: { params: Promise<{ id: string }> }
) {
  void cleanupClosedTickets().catch(() => {})

  const { id } = await context.params
  if (!isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: 'Invalid ticket id' }, { status: 400 })
  }

  await connectDB()
  const ticket = await Ticket.findById(id).populate('userId', 'name email').lean()

  if (!ticket) {
    return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 })
  }

  if (String((ticket as any).userId?._id || (ticket as any).userId) !== String(user._id)) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  }

  const messages = await TicketMessage.find({ ticketId: id })
    .sort({ createdAt: 1 })
    .lean()

  await Ticket.findByIdAndUpdate(id, { unreadByUser: false })

  return NextResponse.json({
    success: true,
    data: { ticket, messages },
  })
}

export const GET = requireAuth(getHandler)
