import { NextRequest, NextResponse } from 'next/server'
import { isValidObjectId } from 'mongoose'
import connectDB from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import Ticket, { TicketStatus } from '@/models/Ticket'
import { canTransitionTicketStatus } from '@/lib/tickets/lifecycle'

const VALID_STATUSES: TicketStatus[] = ['open', 'pending', 'resolved', 'closed']

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function patchHandler(
  request: NextRequest,
  admin: any,
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

  const body = await request.json().catch(() => null)
  const nextStatus = body?.status as TicketStatus | undefined

  if (!nextStatus || !VALID_STATUSES.includes(nextStatus)) {
    return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 })
  }

  if (!canTransitionTicketStatus(ticket.status as TicketStatus, nextStatus)) {
    return NextResponse.json({ success: false, error: 'Invalid status transition' }, { status: 400 })
  }

  ticket.status = nextStatus
  ticket.closedAt = nextStatus === 'closed' ? new Date() : null
  ticket.assignedAdminId = admin._id
  ticket.unreadByUser = true
  ticket.unreadByAdmin = false
  await ticket.save()

  return NextResponse.json({ success: true, data: { status: ticket.status } })
}

export const PATCH = requireAdmin(patchHandler)
