import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getAdminActivityLogs } from '@/features/admin/db/activity-log'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function handler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const requestedLimit = Number.parseInt(searchParams.get('limit') || '50', 10)
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 50

    const logs = await getAdminActivityLogs(limit)

    return NextResponse.json({
      success: true,
      data: {
        logs,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Failed to get activity logs' }, { status: 500 })
  }
}

export const GET = requireAdmin(handler)
