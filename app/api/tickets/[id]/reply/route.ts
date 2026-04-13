import { NextRequest, NextResponse } from 'next/server'
import { isValidObjectId } from 'mongoose'
import connectDB from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import Ticket from '@/models/Ticket'
import TicketMessage from '@/models/TicketMessage'
import { saveTicketAttachments } from '@/lib/tickets/attachments'
import { cleanupClosedTickets } from '@/lib/tickets/cleanup'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function postHandler(
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
  const ticket = await Ticket.findById(id)
  if (!ticket) {
    return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 })
  }

  if (String(ticket.userId) !== String(user._id)) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  }

  if (ticket.status === 'closed') {
    return NextResponse.json({ success: false, error: 'Closed tickets are read-only' }, { status: 400 })
  }

  const formData = await request.formData()
  const message = String(formData.get('message') || '').trim()

  if (!message || message.length < 2) {
    return NextResponse.json({ success: false, error: 'Reply is required' }, { status: 400 })
  }

  let attachments: string[] = []
  try {
    attachments = await saveTicketAttachments(formData, String(user._id), String(ticket._id))
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to save attachment' }, { status: 400 })
  }

  await TicketMessage.create({
    ticketId: ticket._id,
    senderId: user._id,
    senderRole: 'user',
    message,
    attachments,
  })

  ticket.status = ticket.status === 'resolved' ? 'pending' : ticket.status
  ticket.unreadByAdmin = true
  ticket.unreadByUser = false
  ticket.lastMessageAt = new Date()
  await ticket.save()

  return NextResponse.json({ success: true })
}

export const POST = requireAuth(postHandler)
