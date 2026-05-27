import { NextRequest, NextResponse } from 'next/server'
import { deriveChatSessionContext, attachAnonChatCookie } from '@/lib/chatbot-session'
import { sendChatbotServiceMessage } from '@/lib/chatbot-service'

export async function POST(request: NextRequest) {
  let body: { message?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    )
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) {
    return NextResponse.json(
      { error: 'message is required' },
      { status: 400 }
    )
  }

  try {
    const { anonCookieValue, sessionId } = await deriveChatSessionContext(request)
    const response = await sendChatbotServiceMessage({
      session_id: sessionId,
      message,
    })

    return attachAnonChatCookie(NextResponse.json(response), anonCookieValue)
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to reach chatbot service',
      },
      { status: 502 }
    )
  }
}
