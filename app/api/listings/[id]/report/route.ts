import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Report from '@/models/Report'
import { getAuthUser } from '@/lib/auth'
import { isValidObjectId } from 'mongoose'
import Product from '@/models/Product'
import { rateLimitByKey } from '@/lib/rateLimit'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid listing ID format' },
        { status: 400 }
      )
    }
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Please log in to report' },
        { status: 401 }
      )
    }

    const limited = rateLimitByKey(`report:${user._id}`, 20, 60 * 60 * 1000)
    if (limited) return limited

    await connectDB()
    const body = await request.json().catch(() => null)
    const reason = body?.reason

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0 || reason.length > 1000) {
      return NextResponse.json(
        { success: false, error: 'Please provide a reason (max 1000 characters)' },
        { status: 400 }
      )
    }

    const listingExists = await Product.exists({ _id: id })
    if (!listingExists) {
      return NextResponse.json(
        { success: false, error: 'Listing not found' },
        { status: 404 }
      )
    }

    await Report.create({
      listing: id,
      reporter: user._id,
      reason: reason.trim(),
    })

    return NextResponse.json({
      success: true,
      message: 'Report submitted. Thank you.',
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to submit report' },
      { status: 500 }
    )
  }
}
