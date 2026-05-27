import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { deriveChatSessionContext, attachAnonChatCookie } from '@/lib/chatbot-session'
import { sendChatbotServiceMessage } from '@/lib/chatbot-service'
import { singleFlight } from '@/lib/services/single-flight'
import { rateLimit } from '@/lib/rateLimit'
import type {
  AiChatErrorResponse,
  AiChatRequestBody,
  AiChatStreamDoneEvent,
  AiChatStreamErrorEvent,
  AiChatStreamReplyEvent,
} from '@/types/ai'

const chatRateLimit = rateLimit(10, 60_000)
const encoder = new TextEncoder()

function sha1(value: string) {
  return crypto.createHash('sha1').update(value).digest('hex')
}

function sseEvent(data: AiChatStreamReplyEvent | AiChatStreamDoneEvent | AiChatStreamErrorEvent) {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
}

function getDegradedReply() {
  return 'The Weggo assistant is temporarily unavailable. You can still browse listings, use filters, and message sellers while the AI service recovers.'
}

export async function POST(request: NextRequest) {
  const limited = chatRateLimit(request)
  if (limited) return limited

  let body: Partial<AiChatRequestBody>

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON payload' } satisfies AiChatErrorResponse,
      { status: 400 }
    )
  }

  const text = typeof body.message === 'string' ? body.message.trim() : ''
  if (!text) {
    return NextResponse.json(
      { success: false, error: 'Message is required' } satisfies AiChatErrorResponse,
      { status: 400 }
    )
  }

  const { anonCookieValue, sessionId } = await deriveChatSessionContext(request)
  const stream = new TransformStream<Uint8Array, Uint8Array>()
  const writer = stream.writable.getWriter()

  void (async () => {
    try {
      const result = await singleFlight(`chat:${sessionId}:${sha1(text)}`, async () => {
        if (!process.env.CHATBOT_API_URL?.trim()) {
          return {
            degraded: true,
            response: getDegradedReply(),
          }
        }

        const chatbotResponse = await sendChatbotServiceMessage({
          session_id: sessionId,
          message: text,
        })

        return {
          degraded: false,
          response: chatbotResponse.reply,
        }
      })

      await writer.write(sseEvent({
        type: 'reply',
        response: result.response,
        degraded: result.degraded,
      }))
      await writer.write(sseEvent({ type: 'done' }))
    } catch (error) {
      await writer.write(sseEvent({
        type: 'error',
        error: error instanceof Error ? error.message : 'Failed to process AI request',
      }))
      await writer.write(sseEvent({
        type: 'reply',
        response: getDegradedReply(),
        degraded: true,
      }))
      await writer.write(sseEvent({ type: 'done' }))
    } finally {
      await writer.close()
    }
  })()

  const response = new NextResponse(stream.readable, {
    headers: {
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream; charset=utf-8',
      Vary: 'Cookie',
    },
  })

  return attachAnonChatCookie(response, anonCookieValue)
}
