import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { requireAdmin } from '@/lib/auth'

// POST /api/admin/users/[id]/ban - Ban or unban a user
async function handler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin(request as any)
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    await connectDB()

    const body = await request.json()
    const { action, reason } = body // action: 'ban' or 'unban'

    if (!['ban', 'unban'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be ban or unban' },
        { status: 400 }
      )
    }

    const userId = params.id

    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent banning other admins
    if (user.role === 'admin') {
      return NextResponse.json(
        { success: false, error: 'Cannot ban admin users' },
        { status: 403 }
      )
    }

    if (action === 'ban') {
      if (!reason) {
        return NextResponse.json(
          { success: false, error: 'Ban reason is required' },
          { status: 400 }
        )
      }

      user.banned = true
      user.bannedAt = new Date()
      user.bannedReason = reason
      user.bannedBy = (admin as any)._id
    } else {
      user.banned = false
      user.bannedAt = undefined
      user.bannedReason = undefined
      user.bannedBy = undefined
    }

    await user.save()

    return NextResponse.json({
      success: true,
      message: `User ${action === 'ban' ? 'banned' : 'unbanned'} successfully`,
      data: {
        userId: user._id,
        banned: user.banned,
        bannedAt: user.bannedAt,
        bannedReason: user.bannedReason,
      },
    })
  } catch (error: any) {
    console.error('Ban user error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update user ban status' },
      { status: 500 }
    )
  }
}

export const POST = handler
