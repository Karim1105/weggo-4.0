import { NextRequest, NextResponse } from 'next/server'
import { clearCsrfTokenCookie } from '@/lib/csrf'

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' })
  
  // Clear auth token - set to expired date (more reliable than maxAge: 0)
  const pastDate = new Date(0)
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: pastDate
  })
  
  clearCsrfTokenCookie(response)
  
  // Add cache control headers to prevent caching
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  
  return response
}


