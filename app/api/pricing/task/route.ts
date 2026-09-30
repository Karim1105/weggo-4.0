import { NextRequest, NextResponse } from 'next/server'
import { createPricingJob } from '@/lib/pricingJobStore'
import { getAuthUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rateLimit'
import { parsePricingInput } from '@/lib/pricingInput'

export async function POST(request: NextRequest) {
  const rateLimitResponse = rateLimit(20, 15 * 60 * 1000)(request)
  if (rateLimitResponse) return rateLimitResponse

  const user = await getAuthUser(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const input = parsePricingInput(await request.json().catch(() => null))

    if (!input || !input.title || !input.category || !input.condition) {
      return NextResponse.json(
        { success: false, error: 'Title, category, and condition are required' },
        { status: 400 }
      )
    }

    const job = createPricingJob(input, user._id.toString())

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
