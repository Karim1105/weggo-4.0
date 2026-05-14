import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { requireAdmin } from '@/lib/auth'
import { elasticClient, isIgnorableElasticError } from '@/lib/elastic'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function handler(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') // 'banned', 'verified', 'all'

    const skip = (page - 1) * limit

    const toUserDto = (u: any) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      isVerified: u.isVerified,
      sellerVerified: u.sellerVerified,
      banned: u.banned,
      bannedAt: u.bannedAt,
      bannedReason: u.bannedReason,
      bannedBy: u.bannedBy,
      location: u.location,
      phone: u.phone,
      createdAt: u.createdAt,
    })

    const jsonResponse = (users: any[], total: number) => {
      const response = NextResponse.json({
        success: true,
        data: {
          users: users.map(toUserDto),
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      })

      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')

      return response
    }

    if (search) {
      try {
        const result = await elasticClient.search({
          index: 'users',
          from: skip,
          size: limit,
          query: {
            bool: {
              must: [
                {
                  multi_match: {
                    query: search,
                    fields: ['name', 'email'],
                    fuzziness: 'AUTO'
                  }
                }
              ],
              filter: status === 'banned' ? [{ term: { banned: true } }]
                      : status === 'verified' ? [{ term: { sellerVerified: true } }]
                      : []
            }
          },
          sort: [{ createdAt: 'desc' }, { _id: 'desc' }]
        })

        const esHits = result.hits.hits
        const total = typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value || 0
        const userIds = esHits.map(h => h._id)

        const rawUsers = await User.find({ _id: { $in: userIds } })
          .select('-password -resetPasswordToken -resetPasswordExpires')
          .populate('bannedBy', 'name')
          .lean()

        const userMap = new Map()
        rawUsers.forEach(u => userMap.set(String(u._id), u))
        const users = userIds.map(id => userMap.get(id)).filter(Boolean)

        return jsonResponse(users, total)
      } catch (error) {
        if (!isIgnorableElasticError(error)) {
          throw error
        }
      }
    }

    const query: any = {}

    if (status === 'banned') {
      query.banned = true
    } else if (status === 'verified') {
      query.sellerVerified = true
    }

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      query.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } },
      ]
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -resetPasswordToken -resetPasswordExpires')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('bannedBy', 'name')
        .lean(),
      User.countDocuments(query),
    ])

    return jsonResponse(users, total)
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get users' },
      { status: 500 }
    )
  }
}

export const GET = requireAdmin(handler)
