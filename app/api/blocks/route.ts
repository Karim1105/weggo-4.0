import { NextRequest, NextResponse } from 'next/server'
import { isValidObjectId } from 'mongoose'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { requireAuth } from '@/lib/auth'

async function handler(request: NextRequest, user: any) {
  await connectDB()

  if (request.method === 'GET') {
    const me = await User.findById(user._id)
      .populate('blockedUsers', 'name email avatar')
      .lean() as { blockedUsers?: unknown[] } | null

    return NextResponse.json({
      success: true,
      blockedUsers: me?.blockedUsers ?? [],
    })
  }

  const body = await request.json().catch(() => ({}))
  const { userId } = body

  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'userId is required' },
      { status: 400 }
    )
  }

  if (typeof userId !== 'string' || !isValidObjectId(userId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid user ID format' },
      { status: 400 }
    )
  }

  if (userId === user._id.toString()) {
    return NextResponse.json(
      { success: false, error: 'You cannot block yourself' },
      { status: 400 }
    )
  }

  const targetUser = await User.findById(userId).select('_id').lean()
  if (!targetUser) {
    return NextResponse.json(
      { success: false, error: 'User not found' },
      { status: 404 }
    )
  }

  if (request.method === 'POST') {
    await User.findByIdAndUpdate(
      user._id,
      { $addToSet: { blockedUsers: userId } },
      { new: true }
    )
    return NextResponse.json({ success: true })
  }

  if (request.method === 'DELETE') {
    await User.findByIdAndUpdate(
      user._id,
      { $pull: { blockedUsers: userId } },
      { new: true }
    )
    return NextResponse.json({ success: true })
  }

  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  )
}

export const GET = requireAuth(handler)
export const POST = requireAuth(handler)
export const DELETE = requireAuth(handler)
