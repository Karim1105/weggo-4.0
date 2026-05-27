import type {
  ExtractedChatbotServiceErrorResponse,
  ExtractedChatbotServiceRequest,
  ExtractedChatbotServiceResponse,
} from '@/types/ai'
import { getCircuitBreaker } from '@/lib/services/circuit-breaker'
import { getLimiter } from '@/lib/services/concurrency'
import { requestJson, requestStream } from '@/lib/services/http-client'

const breaker = getCircuitBreaker('chatbot')
const limiter = getLimiter('chatbot', 32)

function isChatbotServiceResponse(value: unknown): value is ExtractedChatbotServiceResponse {
  if (!value || typeof value !== 'object') return false

  const candidate = value as ExtractedChatbotServiceResponse
  return typeof candidate.session_id === 'string' && typeof candidate.reply === 'string'
}

function getChatbotServiceErrorMessage(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null

  const candidate = value as ExtractedChatbotServiceErrorResponse
  if (typeof candidate.detail === 'string') return candidate.detail
  if (typeof candidate.error === 'string') return candidate.error
  return null
}

export function getChatbotApiUrl(): string | null {
  const url = process.env.CHATBOT_API_URL?.trim()
  if (!url) return null
  return url.replace(/\/+$/, '')
}

function getInternalHeaders() {
  const token = process.env.INTERNAL_SERVICE_TOKEN?.trim()
  return token ? { 'X-Internal-Auth': token } : undefined
}

export async function sendChatbotServiceMessage(
  payload: ExtractedChatbotServiceRequest
): Promise<ExtractedChatbotServiceResponse> {
  const baseUrl = getChatbotApiUrl()
  if (!baseUrl) {
    throw new Error('CHATBOT_API_URL is not configured')
  }

  return limiter(() =>
    breaker.run('chatbot service', async () => {
      const data = await requestJson<unknown>(`${baseUrl}/chat`, {
        method: 'POST',
        body: payload,
        headers: getInternalHeaders(),
        timeoutMs: 8_000,
        signal: undefined,
      })

      if (!isChatbotServiceResponse(data)) {
        throw new Error(getChatbotServiceErrorMessage(data) || 'Chatbot service returned an invalid payload')
      }

      return data
    })
  )
}

export async function streamChatbotServiceMessage(
  payload: ExtractedChatbotServiceRequest,
  signal?: AbortSignal
) {
  const baseUrl = getChatbotApiUrl()
  if (!baseUrl) {
    throw new Error('CHATBOT_API_URL is not configured')
  }

  return limiter(() =>
    breaker.run('chatbot service', () =>
      requestStream(`${baseUrl}/chat/stream`, {
        method: 'POST',
        body: payload,
        headers: {
          Accept: 'text/event-stream',
          ...getInternalHeaders(),
        },
        timeoutMs: 30_000,
        signal,
      })
    )
  )
}
