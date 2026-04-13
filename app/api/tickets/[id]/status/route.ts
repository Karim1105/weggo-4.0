import { NextRequest, NextResponse } from 'next/server'
import { isValidObjectId } from 'mongoose'
import connectDB from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import Ticket, { TicketStatus } from '@/models/Ticket'
import { canTransitionTicketStatus } from '@/lib/tickets/lifecycle'

const VALID_STATUSES: TicketStatus[] = ['open', 'pending', 'resolved', 'closed']

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function patchHandler(
  request: NextRequest,
  user: any,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  if (!isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: 'Invalid ticket id' }, { status: 400 })
  }

  await connectDB()
  const ticket = await Ticket.findById(id)
  if (!ticket) {
    return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 })
  }

  const isOwner = String(ticket.userId) === String(user._id)
  const isAdmin = user.role === 'admin'

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => null)
  const nextStatus = body?.status as TicketStatus | undefined

  if (!nextStatus || !VALID_STATUSES.includes(nextStatus)) {
    return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 })
  }

  if (!isAdmin && nextStatus !== 'closed') {
    return NextResponse.json({ success: false, error: 'Only admins can set this status' }, { status: 403 })
  }

  if (!canTransitionTicketStatus(ticket.status as TicketStatus, nextStatus)) {
    return NextResponse.json({ success: false, error: 'Invalid status transition' }, { status: 400 })
  }

  ticket.status = nextStatus
  ticket.closedAt = nextStatus === 'closed' ? new Date() : null
  ticket.unreadByAdmin = isAdmin ? ticket.unreadByAdmin : true
  ticket.unreadByUser = isAdmin ? true : ticket.unreadByUser
  await ticket.save()

  return NextResponse.json({ success: true, data: { status: ticket.status, closedAt: ticket.closedAt } })
}

export const PATCH = requireAuth(patchHandler)
