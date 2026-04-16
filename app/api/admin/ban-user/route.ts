import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import Product from '@/models/Product'
import { requireAdmin } from '@/lib/auth'
import { logger, getRequestId } from '@/lib/logger'
import { invalidateMarketplaceDiscoveryCaches } from '@/lib/cache'

// POST /api/admin/ban-user - Simple endpoint to ban a user
async function handler(request: NextRequest, admin: any) {
  const requestId = getRequestId(request)

  try {
    await connectDB()

    const body = await request.json()
    const { userId, email, reason } = body

    if (!userId && !email) {
      return NextResponse.json(
        { success: false, error: 'Either userId or email is required' },
        { status: 400 }
      )
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { success: false, error: 'Ban reason is required' },
        { status: 400 }
      )
    }

    const trimmedReason = reason.trim()
    if (trimmedReason.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Ban reason cannot exceed 500 characters' },
        { status: 400 }
      )
    }

    // Find user by ID or email
    const query = userId ? { _id: userId } : { email: email.toLowerCase() }
    const user = await User.findOne(query)

    if (!user) {
      logger.warn('Ban user - user not found', { userId, email }, requestId)
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent banning already banned users
    if (user.banned) {
      logger.info('Ban user - user already banned', { userId: user._id }, requestId)
      return NextResponse.json(
        { success: false, error: 'User is already banned' },
        { status: 400 }
      )
    }

    // Prevent banning admin users
    if (user.role === 'admin') {
      return NextResponse.json(
        { success: false, error: 'Cannot ban admin users' },
        { status: 403 }
      )
    }

    // Ban the user
    user.banned = true
    user.bannedAt = new Date()
    user.bannedReason = trimmedReason
    user.bannedBy = (admin as any)._id

    // Mark all user's listings as deleted (soft delete) and set expiresAt for TTL cleanup
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const listingResult = await Product.updateMany(
      { seller: user._id, status: { $ne: 'deleted' } },
      { $set: { status: 'deleted', expiresAt } }
    )

    await user.save()

    invalidateMarketplaceDiscoveryCaches()

    logger.info('User banned successfully with listings deleted', { userId: user._id, email: user.email, adminId: admin._id, listingsDeleted: listingResult.modifiedCount }, requestId)

    return NextResponse.json(
      {
        success: true,
        message: `User banned successfully and ${listingResult.modifiedCount} listings marked as deleted`,
        data: {
          userId: user._id,
          email: user.email,
          name: user.name,
          banned: user.banned,
          bannedAt: user.bannedAt,
          bannedReason: user.bannedReason,
          bannedBy: user.bannedBy,
          listingsDeleted: listingResult.modifiedCount,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    logger.error('Ban user error', error, { endpoint: '/api/admin/ban-user' }, requestId)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to ban user' },
      { status: 500 }
    )
  }
}

export const POST = requireAdmin(handler)
