import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'

async function handler(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const enabled = body?.enabled

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ success: false, error: 'enabled must be a boolean' }, { status: 400 })
    }

    const response = NextResponse.json({ success: true, data: { enabled } })
    response.cookies.set('adminView', enabled ? 'on' : 'off', {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })

    return response
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update admin view mode' }, { status: 500 })
  }
}

export const POST = requireAdmin(handler)
