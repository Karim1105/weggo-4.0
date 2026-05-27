import type { AiChatStreamEvent, ExtractedChatbotStructuredReply } from '@/types/ai'

function isStructuredReply(value: unknown): value is ExtractedChatbotStructuredReply {
  if (!value || typeof value !== 'object') return false

  const candidate = value as ExtractedChatbotStructuredReply
  return (
    typeof candidate.has_results === 'boolean' &&
    typeof candidate.message === 'string' &&
    Array.isArray(candidate.results)
  )
}

export function parseAiChatStreamEvent(raw: string): AiChatStreamEvent | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AiChatStreamEvent>
    if (parsed.type === 'reply' && typeof parsed.response === 'string') {
      return { type: 'reply', response: parsed.response, degraded: parsed.degraded === true }
    }

    if (parsed.type === 'done') {
      return { type: 'done' }
    }

    if (parsed.type === 'error' && typeof parsed.error === 'string') {
      return { type: 'error', error: parsed.error }
    }

    return null
  } catch {
    return null
  }
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
