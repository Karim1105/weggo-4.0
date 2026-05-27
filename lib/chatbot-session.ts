import crypto from 'crypto'
import type { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

const ANON_CHAT_COOKIE = 'anon_chat_id'
const THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60

function getSessionSecret() {
  return (
    process.env.AI_CHAT_SESSION_SECRET?.trim() ||
    process.env.INTERNAL_SERVICE_TOKEN?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    'dev-chat-session-secret'
  )
}

function signChatIdentity(identity: string) {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(identity)
    .digest('hex')
}

export interface ChatSessionContext {
  anonCookieValue?: string
  sessionId: string
}

export async function deriveChatSessionContext(request: NextRequest): Promise<ChatSessionContext> {
  const user = await getAuthUser(request)
  if (user?._id) {
    return {
      sessionId: signChatIdentity(`user:${user._id.toString()}`),
    }
  }

  const existingAnonId = request.cookies.get(ANON_CHAT_COOKIE)?.value?.trim()
  const anonCookieValue = existingAnonId || crypto.randomUUID()

  return {
    anonCookieValue: existingAnonId ? undefined : anonCookieValue,
    sessionId: signChatIdentity(`anon:${anonCookieValue}`),
  }
}

export function attachAnonChatCookie(response: NextResponse, anonCookieValue?: string) {
  if (!anonCookieValue) return response

  response.cookies.set({
    name: ANON_CHAT_COOKIE,
    value: anonCookieValue,
    httpOnly: true,
    maxAge: THIRTY_DAYS_IN_SECONDS,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  })

  return response
}
