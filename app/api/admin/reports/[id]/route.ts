import { NextRequest, NextResponse } from 'next/server'
import { isValidObjectId } from 'mongoose'
import connectDB from '@/lib/db'
import Report from '@/models/Report'
import Product from '@/models/Product'
import { requireAdmin } from '@/lib/auth'
import { invalidateMarketplaceDiscoveryCaches } from '@/lib/cache'
import { queueListingDeleteForSync } from '@/lib/api/listings/sync'
import { ensureLancedbSyncWorkerStarted, kickLancedbSyncWorker } from '@/lib/workers/lancedb-sync'

async function getHandler(
  request: NextRequest,
  admin: any,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reportId } = await context.params
    if (!isValidObjectId(reportId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid report ID format' },
        { status: 400 }
      )
    }

    await connectDB()

    const reportRaw = await Report.findById(reportId)
      .populate({
        path: 'listing',
        select: 'title images status seller price location description',
        populate: {
          path: 'seller',
          select: 'name email',
        },
      })
      .populate('reporter', 'name email')
      .populate('reviewedBy', 'name')
      .lean()

    if (!reportRaw) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      )
    }

    const report = {
      ...reportRaw,
      listing: reportRaw.listing
        ? {
            ...(reportRaw.listing as any),
            images: Array.isArray((reportRaw.listing as any).images)
              ? (reportRaw.listing as any).images
                  .filter((img: string) => typeof img === 'string' && !img.startsWith('data:'))
                  .slice(0, 1)
              : [],
          }
        : null,
    }

    return NextResponse.json({
      success: true,
      data: {
        report,
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch report detail' },
      { status: 500 }
    )
  }
}

// POST /api/admin/reports/[id] - Take action on a report
async function handler(
  request: NextRequest,
  admin: any,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reportId } = await context.params
    if (!isValidObjectId(reportId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid report ID format' },
        { status: 400 }
      )
    }

    await connectDB()

    const body = await request.json()
    const { action, actionTaken } = body
    // action: 'dismiss', 'delete-listing', 'warn-seller', 'resolve'

    const report = await Report.findById(reportId).populate('listing')
    if (!report) {
      return NextResponse.json(
        { success: false, error: 'Report not found' },
        { status: 404 }
      )
    }

    let newStatus: 'pending' | 'reviewed' | 'resolved' | 'dismissed' = 'reviewed'

    switch (action) {
      case 'dismiss':
        newStatus = 'dismissed'
        break

      case 'delete-listing':
        // Soft delete the listing
        if (report.listing) {
          const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          await Product.findByIdAndUpdate(report.listing, {
            status: 'deleted',
            expiresAt,
          })
          invalidateMarketplaceDiscoveryCaches()
          await queueListingDeleteForSync(report.listing.toString())
          ensureLancedbSyncWorkerStarted()
          kickLancedbSyncWorker()
        }
        newStatus = 'resolved'
        break

      case 'warn-seller':
        // Mark as reviewed (warning sent separately)
        newStatus = 'reviewed'
        break

      case 'resolve':
        newStatus = 'resolved'
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        )
    }

    report.status = newStatus
    report.actionTaken = actionTaken || action
    report.reviewedBy = (admin as any)._id
    report.reviewedAt = new Date()

    await report.save()

    return NextResponse.json({
      success: true,
      message: 'Report action completed successfully',
      data: {
        reportId: report._id,
        status: report.status,
        actionTaken: report.actionTaken,
      },
    })
  } catch (error: any) {
    console.error('Report action error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process report action' },
      { status: 500 }
    )
  }
}

export const GET = requireAdmin(getHandler)
export const POST = requireAdmin(handler)
