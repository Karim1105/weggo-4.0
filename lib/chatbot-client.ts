import type { ExtractedChatbotStructuredReply } from '@/types/ai'

function isStructuredReply(value: unknown): value is ExtractedChatbotStructuredReply {
  if (!value || typeof value !== 'object') return false

  const candidate = value as ExtractedChatbotStructuredReply
  return (
    typeof candidate.has_results === 'boolean' &&
    typeof candidate.message === 'string' &&
    Array.isArray(candidate.results)
  )
}

export function createChatSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function formatChatbotReply(reply: string): string {
  try {
    const parsed = JSON.parse(reply) as unknown
    if (!isStructuredReply(parsed)) return reply

    if (!parsed.has_results || parsed.results.length === 0) {
      return parsed.message
    }

    const lines = parsed.results.map((result) => {
      const prefix = result.relevance === 'exact' ? '✅' : '🔎'
      const note = result.match_note ? `\n${result.match_note}` : ''
      return `${prefix} ${result.title} - ${result.price}${note}`
    })

    return [parsed.message, '', ...lines].join('\n')
  } catch {
    return reply
  }
}
