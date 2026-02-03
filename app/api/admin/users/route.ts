import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { requireAdmin } from '@/lib/auth'

async function handler(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') // 'banned', 'verified', 'all'

    const skip = (page - 1) * limit

    // Build query
    const query: any = {}
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ]
    }

    if (status === 'banned') {
      query.banned = true
    } else if (status === 'verified') {
      query.sellerVerified = true
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -resetPasswordToken -resetPasswordExpires')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('bannedBy', 'name email')
        .lean(),
      User.countDocuments(query),
    ])

    return NextResponse.json({
      success: true,
      data: {
        users: users.map((u: any) => ({
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
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get users' },
      { status: 500 }
    )
  }
}

export const GET = requireAdmin(handler)
