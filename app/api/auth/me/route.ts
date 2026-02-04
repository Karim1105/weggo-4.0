import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { setCsrfTokenCookie } from '@/lib/csrf'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      const response = NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
      // Prevent caching of auth state
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
      response.headers.set('Pragma', 'no-cache')
      return response
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        location: user.location,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified,
        sellerVerified: (user as any).sellerVerified ?? false,
        banned: (user as any).banned ?? false,
      },
    })
    
    // Prevent caching of auth state
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    
    if (!request.cookies.get('csrfToken')) {
      setCsrfTokenCookie(response)
    }
    return response
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get user' },
      { status: 500 }
    )
  }
}


