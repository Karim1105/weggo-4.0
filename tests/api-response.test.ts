import { describe, it, expect } from 'vitest'
import { successResponse, errorResponse } from '@/lib/api-response'

describe('api-response', () => {
  it('formats success response', async () => {
    const res = successResponse({ ok: true }, 'done', 201)
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.success).toBe(true)
    expect(body.data.ok).toBe(true)
    expect(body.message).toBe('done')
  })

  it('formats error response', async () => {
    const res = errorResponse('bad', 400, 'BAD', { field: 'x' })
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error).toBe('bad')
    expect(body.code).toBe('BAD')
    expect(body.details.field).toBe('x')
  })
})
