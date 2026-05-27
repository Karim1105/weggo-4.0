import { NextRequest, NextResponse } from 'next/server'
import { sendChatbotServiceMessage } from '@/lib/chatbot-service'
import type { ExtractedChatbotServiceRequest } from '@/types/ai'

export async function POST(request: NextRequest) {
  let body: Partial<ExtractedChatbotServiceRequest>

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    )
  }

  const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''

  if (!sessionId || !message) {
    return NextResponse.json(
      { error: 'session_id and message are required' },
      { status: 400 }
    )
  }

  try {
    const response = await sendChatbotServiceMessage({
      session_id: sessionId,
      message,
    })

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to reach chatbot service',
      },
      { status: 502 }
    )
  }
}
