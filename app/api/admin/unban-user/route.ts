import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import Product from '@/models/Product'
import { requireAdmin } from '@/lib/auth'
import { logger, getRequestId } from '@/lib/logger'
import { invalidateMarketplaceDiscoveryCaches } from '@/lib/cache'

// POST /api/admin/unban-user - Simple endpoint to unban a user
async function handler(request: NextRequest, admin: any) {
  const requestId = getRequestId(request)

  try {
    await connectDB()

    const body = await request.json()
    const { userId, email } = body

    if (!userId && !email) {
      return NextResponse.json(
        { success: false, error: 'Either userId or email is required' },
        { status: 400 }
      )
    }

    // Find user by ID or email
    const query = userId ? { _id: userId } : { email: email.toLowerCase() }
    const user = await User.findOne(query)

    if (!user) {
      logger.warn('Unban user - user not found', { userId, email }, requestId)
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent unbanning users who aren't banned
    if (!user.banned) {
      logger.info('Unban user - user is not banned', { userId: user._id }, requestId)
      return NextResponse.json(
        { success: false, error: 'User is not banned' },
        { status: 400 }
      )
    }

    // Unban the user
    user.banned = false
    user.bannedAt = undefined
    user.bannedReason = undefined
    user.bannedBy = undefined

    // Restore all user's listings that were deleted (set back to active) and remove expiresAt
    // Only restore listings that were soft-deleted with an expiresAt (i.e. admin/ban deletions)
    const listingResult = await Product.updateMany(
      { seller: user._id, status: 'deleted', expiresAt: { $exists: true } },
      { $set: { status: 'active' }, $unset: { expiresAt: 1 } }
    )

    await user.save()
    invalidateMarketplaceDiscoveryCaches()

    logger.info('User unbanned successfully with listings restored', { userId: user._id, email: user.email, adminId: admin._id, listingsRestored: listingResult.modifiedCount }, requestId)

    return NextResponse.json(
      {
        success: true,
        message: `User unbanned successfully and ${listingResult.modifiedCount} listings restored`,
        data: {
          userId: user._id,
          email: user.email,
          name: user.name,
          banned: user.banned,
          listingsRestored: listingResult.modifiedCount,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    logger.error('Unban user error', error, { endpoint: '/api/admin/unban-user' }, requestId)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to unban user' },
      { status: 500 }
    )
  }
}

export const POST = requireAdmin(handler)
