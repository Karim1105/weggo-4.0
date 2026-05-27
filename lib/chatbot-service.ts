import type {
  ExtractedChatbotServiceErrorResponse,
  ExtractedChatbotServiceRequest,
  ExtractedChatbotServiceResponse,
} from '@/types/ai'

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

export async function sendChatbotServiceMessage(
  payload: ExtractedChatbotServiceRequest
): Promise<ExtractedChatbotServiceResponse> {
  const baseUrl = getChatbotApiUrl()
  if (!baseUrl) {
    throw new Error('CHATBOT_API_URL is not configured')
  }

  const response = await fetch(`${baseUrl}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  const data = await response.json().catch(() => null) as unknown

  if (!response.ok) {
    const message = getChatbotServiceErrorMessage(data) || `Chatbot service returned ${response.status}`
    throw new Error(message)
  }

  if (!isChatbotServiceResponse(data)) {
    throw new Error('Chatbot service returned an invalid payload')
  }

  return data
}
