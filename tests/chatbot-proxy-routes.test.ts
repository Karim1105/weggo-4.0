import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const loadChatRoute = async () => import('@/app/api/chat/route')
const loadAiChatRoute = async () => import('@/app/api/ai-chat/route')

function extractSsePayloads(body: string) {
  return body
    .split('\n\n')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => chunk.replace(/^data:\s*/, ''))
}

describe('chatbot proxy routes', () => {
  const originalFetch = global.fetch
  const originalChatbotUrl = process.env.CHATBOT_API_URL

  beforeEach(() => {
    vi.restoreAllMocks()
    delete process.env.CHATBOT_API_URL
  })

  afterEach(() => {
    vi.restoreAllMocks()
    global.fetch = originalFetch
    if (originalChatbotUrl) {
      process.env.CHATBOT_API_URL = originalChatbotUrl
    } else {
      delete process.env.CHATBOT_API_URL
    }
  })

  it('returns 502 when the extracted chatbot service is not configured for /api/chat', async () => {
    const { POST } = await loadChatRoute()
    const response = await POST(new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'hello' }),
    }))
    const json = await response.json()

    expect(response.status).toBe(502)
    expect(json.error).toContain('CHATBOT_API_URL')
  })

  it('proxies /api/chat to the extracted chatbot service with a server-derived session id', async () => {
    process.env.CHATBOT_API_URL = 'http://chatbot.internal:5050'

    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      session_id: 'server-session',
      reply: 'hello from extracted chatbot',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    vi.stubGlobal('fetch', fetchMock)

    const { POST } = await loadChatRoute()
    const response = await POST(new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'hello' }),
    }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.reply).toBe('hello from extracted chatbot')
    expect(response.headers.get('set-cookie')).toContain('anon_chat_id=')
    expect(fetchMock).toHaveBeenCalledWith(
      'http://chatbot.internal:5050/chat',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"message":"hello"'),
      })
    )
    expect(fetchMock.mock.calls[0]?.[1]?.body).toContain('"session_id"')
  })

  it('streams chatbot replies from /api/ai-chat when configured', async () => {
    process.env.CHATBOT_API_URL = 'http://chatbot.internal:5050'

    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      session_id: 'session-42',
      reply: '{"has_results":false,"results":[],"message":"Nothing matched."}',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    vi.stubGlobal('fetch', fetchMock)

    const { POST } = await loadAiChatRoute()
    const response = await POST(new NextRequest('http://localhost/api/ai-chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'ابحث عن هاتف' }),
    }))

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/event-stream')

    const payloads = extractSsePayloads(await response.text())
    expect(payloads.some((payload) => payload.includes('Nothing matched.'))).toBe(true)
    expect(payloads[payloads.length - 1]).toBe('{"type":"done"}')
  })
})
