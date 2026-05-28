import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { isAiChatbotEnabled } from '@/lib/featureFlags'

export const dynamic = 'force-dynamic'

// Public read of feature flags + viewer auth state. Used by the chatbot
// widget to decide whether to render at all (and whether to redirect on
// click). Does not leak any admin-only data.
export async function GET(request: NextRequest) {
  const [user, aiChatbotEnabled] = await Promise.all([
    getAuthUser(request),
    isAiChatbotEnabled(),
  ])

  const isLoggedIn = Boolean(user)
  const isAdmin = user?.role === 'admin'

  return NextResponse.json({
    success: true,
    data: {
      isLoggedIn,
      isAdmin,
      aiChatbotEnabled,
      // Effective access: any logged-in user when enabled; only admins when
      // disabled. Anonymous users are never allowed.
      canUseAiChatbot: isLoggedIn && (aiChatbotEnabled || isAdmin),
    },
  })
}
