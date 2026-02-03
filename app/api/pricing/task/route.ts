import { NextRequest, NextResponse } from 'next/server'
import { createPricingJob } from '@/lib/pricingJobStore'

export async function POST(request: NextRequest) {
  try {
    const { title, description, category, condition } = await request.json()

    if (!title || !category || !condition) {
      return NextResponse.json(
        { success: false, error: 'Title, category, and condition are required' },
        { status: 400 }
      )
    }

    const job = createPricingJob({ title, description, category, condition })

    return NextResponse.json({
      success: true,
      jobId: job.id
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to start pricing job' },
      { status: 500 }
    )
  }
}
