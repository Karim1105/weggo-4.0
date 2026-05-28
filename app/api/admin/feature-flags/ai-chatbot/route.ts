import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { isAiChatbotEnabled, setAiChatbotEnabled } from '@/lib/featureFlags'

async function getHandler() {
  const enabled = await isAiChatbotEnabled()
  return NextResponse.json({ success: true, data: { enabled } })
}

async function putHandler(request: NextRequest, user: { _id: { toString(): string } }) {
  const body = await request.json().catch(() => null) as { enabled?: unknown } | null
  if (typeof body?.enabled !== 'boolean') {
    return NextResponse.json({ success: false, error: 'enabled must be a boolean' }, { status: 400 })
  }

  await setAiChatbotEnabled(body.enabled, user._id.toString())
  return NextResponse.json({ success: true, data: { enabled: body.enabled } })
}

export const GET = requireAdmin(getHandler as never)
export const PUT = requireAdmin(putHandler as never)
