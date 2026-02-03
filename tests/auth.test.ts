import { describe, it, expect } from 'vitest'

const loadAuth = async () => import('@/lib/auth')

describe('auth', () => {
  it('generates and verifies JWT tokens', async () => {
    process.env.JWT_SECRET = 'test-secret'
    const { generateToken, verifyToken } = await loadAuth()
    const token = generateToken({
      _id: 'user-id',
      email: 'user@example.com',
      role: 'user',
    } as any)
    const payload = verifyToken(token)
    expect(payload?.userId).toBe('user-id')
    expect(payload?.email).toBe('user@example.com')
    expect(payload?.role).toBe('user')
  })

  it('returns null for invalid token', async () => {
    process.env.JWT_SECRET = 'test-secret'
    const { verifyToken } = await loadAuth()
    expect(verifyToken('bad.token.value')).toBeNull()
  })
})
