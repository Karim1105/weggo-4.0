import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import Ticket from '@/models/Ticket'
import { parsePagination } from '@/lib/pagination'
import { cleanupClosedTickets } from '@/lib/tickets/cleanup'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getHandler(request: NextRequest) {
  void cleanupClosedTickets().catch(() => {})

  await connectDB()
  const { searchParams } = new URL(request.url)
  const { page, limit, skip } = parsePagination(searchParams, { limit: 15, maxLimit: 100 })
  const status = (searchParams.get('status') || 'all').trim()
  const search = (searchParams.get('search') || '').trim()

  const query: any = {}
  if (status !== 'all') {
    query.status = status
  }

  let userIds: any[] | null = null
  if (search) {
    const User = (await import('@/models/User')).default
    const matchingUsers = await User.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ],
    })
      .select('_id')
      .lean()

    userIds = matchingUsers.map((user: any) => user._id)
    query.$or = [
      { subject: { $regex: search, $options: 'i' } },
      ...(userIds.length > 0 ? [{ userId: { $in: userIds } }] : []),
    ]
  }

  const [tickets, total] = await Promise.all([
    Ticket.find(query)
      .populate('userId', 'name email')
      .sort({ unreadByAdmin: -1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Ticket.countDocuments(query),
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

export const GET = requireAdmin(getHandler)
