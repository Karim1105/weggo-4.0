import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const cookies = request.cookies.getAll()
  
  return NextResponse.json({
    cookies: cookies.map(c => ({
      name: c.name,
      valueLength: c.value.length,
      value: c.value.substring(0, 20) + '...'
    })),
    headers: {
      cookie: request.headers.get('cookie')
    }
  })
}
