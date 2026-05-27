import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const loadChatRoute = async () => import('@/app/api/chat/route')
const loadAiChatRoute = async () => import('@/app/api/ai-chat/route')

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

  it('returns 502 when the extracted chatbot service is not configured', async () => {
    const { POST } = await loadChatRoute()
    const response = await POST(new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session_id: 'session-1', message: 'hello' }),
    }))
    const json = await response.json()

    expect(response.status).toBe(502)
    expect(json.error).toContain('CHATBOT_API_URL')
  })

  it('proxies /api/chat to the extracted chatbot service', async () => {
    process.env.CHATBOT_API_URL = 'http://chatbot.internal:5050'

    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      session_id: 'session-1',
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
      body: JSON.stringify({ session_id: 'session-1', message: 'hello' }),
    }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.reply).toBe('hello from extracted chatbot')
    expect(fetchMock).toHaveBeenCalledWith(
      'http://chatbot.internal:5050/chat',
      expect.objectContaining({
        method: 'POST',
      })
    )
  })

  it('uses the extracted chatbot service from /api/ai-chat when configured', async () => {
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
      body: JSON.stringify({ message: 'ابحث عن هاتف', sessionId: 'session-42' }),
    }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.response).toContain('Nothing matched.')
    expect(fetchMock).toHaveBeenCalledWith(
      'http://chatbot.internal:5050/chat',
      expect.objectContaining({
        method: 'POST',
      })
    )
  })
})
