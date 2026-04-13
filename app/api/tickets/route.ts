import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import Ticket from '@/models/Ticket'
import TicketMessage from '@/models/TicketMessage'
import { parsePagination } from '@/lib/pagination'
import { saveTicketAttachments } from '@/lib/tickets/attachments'
import { cleanupClosedTickets } from '@/lib/tickets/cleanup'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getHandler(request: NextRequest, user: any) {
  void cleanupClosedTickets().catch(() => {})

  await connectDB()
  const { searchParams } = new URL(request.url)
  const { page, limit, skip } = parsePagination(searchParams, { limit: 10, maxLimit: 50 })

  const [tickets, total] = await Promise.all([
    Ticket.find({ userId: user._id })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Ticket.countDocuments({ userId: user._id }),
  ])

  return NextResponse.json({
    success: true,
    data: {
      tickets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    },
  })
}

async function postHandler(request: NextRequest, user: any) {
  void cleanupClosedTickets().catch(() => {})

  await connectDB()

  const contentType = request.headers.get('content-type') || ''
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ success: false, error: 'FormData is required' }, { status: 400 })
  }

  const formData = await request.formData()
  const subject = String(formData.get('subject') || '').trim()
  const message = String(formData.get('message') || '').trim()

  if (!subject || subject.length < 3) {
    return NextResponse.json({ success: false, error: 'Subject must be at least 3 characters' }, { status: 400 })
  }

  if (!message || message.length < 5) {
    return NextResponse.json({ success: false, error: 'Message must be at least 5 characters' }, { status: 400 })
  }

  const ticket = await Ticket.create({
    userId: user._id,
    subject,
    status: 'open',
    unreadByAdmin: true,
    unreadByUser: false,
    lastMessageAt: new Date(),
  })

  let attachments: string[] = []
  try {
    attachments = await saveTicketAttachments(formData, String(user._id), String(ticket._id))
  } catch (error: any) {
    await Ticket.findByIdAndDelete(ticket._id)
    return NextResponse.json({ success: false, error: error.message || 'Failed to save attachment' }, { status: 400 })
  }

  await TicketMessage.create({
    ticketId: ticket._id,
    senderId: user._id,
    senderRole: 'user',
    message,
    attachments,
  })

  return NextResponse.json({
    success: true,
    data: {
      ticketId: ticket._id,
    },
  })
}

export const GET = requireAuth(getHandler)
export const POST = requireAuth(postHandler)
