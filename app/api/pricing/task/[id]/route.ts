import { NextRequest, NextResponse } from 'next/server'
import { getPricingJob } from '@/lib/pricingJobStore'
import { getAuthUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const job = getPricingJob(id, user._id.toString())

    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Pricing job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      job
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to load pricing job' },
      { status: 500 }
    )
  }
}
