import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Report from '@/models/Report'
import Product from '@/models/Product'
import { requireAdmin } from '@/lib/auth'

// POST /api/admin/reports/[id] - Take action on a report
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
    const { action, actionTaken } = body
    // action: 'dismiss', 'delete-listing', 'warn-seller', 'resolve'

    const reportId = params.id

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
          await Product.findByIdAndUpdate(report.listing, { status: 'deleted' })
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

export const POST = handler
