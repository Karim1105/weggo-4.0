import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  }

  const secret = process.env.DEBUG_COOKIES_SECRET
  if (secret && request.headers.get('x-debug-secret') !== secret) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const cookies = request.cookies.getAll()
  
  return NextResponse.json({
    success: true,
    cookies: cookies.map(c => ({
      name: c.name,
      valueLength: c.value.length,
      preview: c.value.substring(0, 8) + '...'
    })),
  })
}
