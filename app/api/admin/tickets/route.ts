import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import Ticket from '@/models/Ticket'
import { parsePagination } from '@/lib/pagination'
import { cleanupClosedTickets } from '@/lib/tickets/cleanup'
import { elasticClient, isIgnorableElasticError } from '@/lib/elastic'

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

  if (search) {
    try {
      const filters: any[] = []
      if (status !== 'all') {
        filters.push({ term: { status: status } })
      }

      const result = await elasticClient.search({
        index: 'tickets',
        from: skip,
        size: limit,
        query: {
          bool: {
            must: [
              {
                match: {
                  subject: {
                    query: search,
                    fuzziness: 'AUTO'
                  }
                }
              }
            ],
            filter: filters
          }
        },
        sort: [{ updatedAt: 'desc' }, { _id: 'desc' }]
      })

      const esHits = result.hits.hits
      const totalResult = typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value || 0
      const ticketIds = esHits.map(h => h._id)

      const rawTickets = await Ticket.find({ _id: { $in: ticketIds } })
        .populate('userId', 'name email')
        .lean()

      const ticketMap = new Map()
      rawTickets.forEach(t => ticketMap.set(String(t._id), t))
      const tickets = ticketIds.map(id => ticketMap.get(id)).filter(Boolean)

      return NextResponse.json({
        success: true,
        data: {
          tickets,
          pagination: { page, limit, total: totalResult, pages: Math.ceil(totalResult / limit) },
        },
        message: 'Tickets fetched successfully via ES',
      })
    } catch (error) {
      if (!isIgnorableElasticError(error)) {
        throw error
      }
    }

    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    query.subject = { $regex: escapedSearch, $options: 'i' }
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
