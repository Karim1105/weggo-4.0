import { describe, expect, it } from 'vitest'
import { formatChatbotReply, parseAiChatStreamEvent } from '@/lib/chatbot-client'

describe('chatbot client helpers', () => {
  it('keeps plain text replies unchanged', () => {
    expect(formatChatbotReply('Hello there')).toBe('Hello there')
  })

  it('parses reply events from the ai chat SSE stream', () => {
    expect(parseAiChatStreamEvent('{"type":"reply","response":"hello"}')).toEqual({
      type: 'reply',
      response: 'hello',
      degraded: false,
    })
    expect(parseAiChatStreamEvent('{"type":"done"}')).toEqual({ type: 'done' })
    expect(parseAiChatStreamEvent('{"type":"error","error":"boom"}')).toEqual({
      type: 'error',
      error: 'boom',
    })
  })

  it('formats structured chatbot listing replies for display', () => {
    const reply = JSON.stringify({
      has_results: true,
      results: [
        {
          listing_id: 'listing-1',
          title: 'iPhone 15 Pro',
          price: '4999',
          relevance: 'exact',
          match_note: 'Exact match',
        },
        {
          listing_id: 'listing-2',
          title: 'iPhone 14 Pro',
          price: '3999',
          relevance: 'close',
          match_note: 'Older generation',
        },
      ],
      message: 'I found some relevant listings.',
    })

    expect(formatChatbotReply(reply)).toContain('I found some relevant listings.')
    expect(formatChatbotReply(reply)).toContain('✅ iPhone 15 Pro - 4999')
    expect(formatChatbotReply(reply)).toContain('🔎 iPhone 14 Pro - 3999')
  })

  it('uses the message when structured replies have no results', () => {
    const reply = JSON.stringify({
      has_results: false,
      results: [],
      message: 'No relevant listings found.',
    })

    expect(formatChatbotReply(reply)).toBe('No relevant listings found.')
  })
})
