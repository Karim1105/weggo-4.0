import { NextRequest, NextResponse } from 'next/server'
import { isValidObjectId } from 'mongoose'
import connectDB from '@/lib/db'
import BanAppeal from '@/models/BanAppeal'
import User from '@/models/User'
import { requireAdmin } from '@/lib/auth'
import { logger, getRequestId } from '@/lib/logger'

async function getHandler(
  request: NextRequest,
  admin: any,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)

  try {
    const { id: appealId } = await context.params
    if (!isValidObjectId(appealId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid appeal ID format' },
        { status: 400 }
      )
    }

    await connectDB()

    const appeal = await BanAppeal.findById(appealId)
      .populate('userId', 'name email bannedAt bannedReason banned')
      .populate('bannedBy', 'name')
      .populate('reviewedBy', 'name')
      .lean()

    if (!appeal) {
      return NextResponse.json(
        { success: false, error: 'Appeal not found' },
        { status: 404 }
      )
    }

    logger.info('Fetched appeal detail', { appealId, adminId: admin._id }, requestId)

    return NextResponse.json({
      success: true,
      data: {
        appeal,
      },
    })
  } catch (error: any) {
    logger.error('Fetch appeal detail error', error, { endpoint: '/api/admin/ban-appeals/[id]' }, requestId)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch appeal' },
      { status: 500 }
    )
  }
}

async function postHandler(
  request: NextRequest,
  admin: any,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)

  try {
    const { id: appealId } = await context.params
    if (!isValidObjectId(appealId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid appeal ID format' },
        { status: 400 }
      )
    }

    await connectDB()

    const body = await request.json()
    const { action, rejectionReason } = body
    // action: 'approve' or 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be approve or reject' },
        { status: 400 }
      )
    }

    const appeal = await BanAppeal.findById(appealId)
    if (!appeal) {
      return NextResponse.json(
        { success: false, error: 'Appeal not found' },
        { status: 404 }
      )
    }

    // Allow admins to override previous decisions
    const previousStatus = appeal.status
    const isOverriding = appeal.status !== 'pending'

    if (isOverriding) {
      logger.warn('Admin is overriding a previous appeal decision', 
        { appealId, previousStatus, adminId: admin._id, requestId }, 
        requestId
      )
    }

    if (action === 'approve') {
      // Unban the user
      const user = await User.findByIdAndUpdate(
        appeal.userId,
        {
          banned: false,
          bannedAt: null,
          bannedReason: null,
          bannedBy: null,
        },
        { new: true }
      )

      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        )
      }

      appeal.status = 'approved'
      appeal.reviewedBy = (admin as any)._id
      appeal.reviewedAt = new Date()

      logger.info('Ban appeal approved', { appealId, userId: appeal.userId, adminId: admin._id }, requestId)
    } else {
      // Reject the appeal
      if (!rejectionReason || !rejectionReason.trim()) {
        return NextResponse.json(
          { success: false, error: 'Rejection reason is required' },
          { status: 400 }
        )
      }

      if (rejectionReason.trim().length > 4096) {
        return NextResponse.json(
          { success: false, error: 'Rejection reason cannot exceed 4096 characters' },
          { status: 400 }
        )
      }

      appeal.status = 'rejected'
      appeal.rejectionReason = rejectionReason.trim()
      appeal.reviewedBy = (admin as any)._id
      appeal.reviewedAt = new Date()

      logger.info('Ban appeal rejected', { appealId, userId: appeal.userId, adminId: admin._id }, requestId)
    }

    await appeal.save()

    return NextResponse.json(
      {
        success: true,
        message: `Appeal ${action === 'approve' ? 'approved' : 'rejected'} successfully${isOverriding ? ' (override)' : ''}`,
        data: {
          appealId: appeal._id,
          status: appeal.status,
          reviewedAt: appeal.reviewedAt,
          previousStatus: isOverriding ? previousStatus : null,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    logger.error('Review ban appeal error', error, { endpoint: '/api/admin/ban-appeals/[id]' }, requestId)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to review appeal' },
      { status: 500 }
    )
  }
}

export const GET = requireAdmin(getHandler)
export const POST = requireAdmin(postHandler)
