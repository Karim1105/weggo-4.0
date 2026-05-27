import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { NextRequest } from 'next/server'

let mongo: MongoMemoryServer

const loadAiChatRoute = async () => import('@/app/api/ai-chat/route')

function extractSsePayloads(body: string) {
  return body
    .split('\n\n')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => chunk.replace(/^data:\s*/, ''))
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongo.getUri()
  process.env.JWT_SECRET = 'test-secret'
})

afterEach(async () => {
  vi.restoreAllMocks()
  delete process.env.CHATBOT_API_URL

  if (mongoose.connection.readyState) {
    await mongoose.connection.dropDatabase()
  }
})

afterAll(async () => {
  if (mongoose.connection.readyState) {
    await mongoose.disconnect()
  }
  await mongo.stop()
})

describe('ai chat route integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects missing message payloads', async () => {
    const { POST } = await loadAiChatRoute()

    const res = await POST(
      new NextRequest('http://localhost/api/ai-chat', {
        method: 'POST',
        headers: new Headers({ 'content-type': 'application/json' }),
        body: JSON.stringify({}),
      })
    )
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error).toBe('Message is required')
  }, 20000)

  it('returns a degraded SSE reply when the chatbot service is not configured', async () => {
    const { POST } = await loadAiChatRoute()

    const res = await POST(
      new NextRequest('http://localhost/api/ai-chat', {
        method: 'POST',
        headers: new Headers({ 'content-type': 'application/json' }),
        body: JSON.stringify({ message: 'How does Weggo work?' }),
      })
    )

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
    expect(res.headers.get('set-cookie')).toContain('anon_chat_id=')

    const payloads = extractSsePayloads(await res.text())
    expect(payloads[0]).toContain('"type":"reply"')
    expect(payloads[0]).toContain('"degraded":true')
    expect(payloads[0]).toContain('temporarily unavailable')
    expect(payloads[payloads.length - 1]).toBe('{"type":"done"}')
  }, 20000)

  it('proxies chatbot responses into SSE when the service is configured', async () => {
    process.env.CHATBOT_API_URL = 'http://chatbot.internal:5050'

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      session_id: 'server-side-session',
      reply: '{"has_results":true,"results":[{"listing_id":"1","title":"iPhone 15","price":"20000","relevance":"exact"}],"message":"I found a match."}',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })))

    const { POST } = await loadAiChatRoute()
    const res = await POST(
      new NextRequest('http://localhost/api/ai-chat', {
        method: 'POST',
        headers: new Headers({ 'content-type': 'application/json' }),
        body: JSON.stringify({ message: 'Show me an iPhone 15' }),
      })
    )

    expect(res.status).toBe(200)
    const payloads = extractSsePayloads(await res.text())
    expect(payloads[0]).toContain('I found a match.')
    expect(payloads[0]).toContain('"degraded":false')
    expect(payloads[payloads.length - 1]).toBe('{"type":"done"}')
  }, 20000)
})
