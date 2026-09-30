import { describe, it, expect, afterEach, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { getClientIp } from '@/lib/clientIp'
import { getSafeRedirectPath } from '@/lib/safeRedirect'
import { rateLimit, resetRateLimitStateForTests } from '@/lib/rateLimit'
import { validateCsrfRequest } from '@/lib/csrf'
import { parsePricingInput } from '@/lib/pricingInput'

const TEST_SECRET = 'test-secret-for-proxy-verification'

afterEach(() => {
  resetRateLimitStateForTests()
})

describe('getClientIp', () => {
  it('prefers X-Real-IP set by the reverse proxy', () => {
    const req = new NextRequest('http://localhost/api/x', {
      headers: { 'x-real-ip': '9.9.9.9', 'x-forwarded-for': '1.1.1.1, 9.9.9.9' },
    })
    expect(getClientIp(req)).toBe('9.9.9.9')
  })

  it('uses the proxy-appended (last) X-Forwarded-For entry, not the spoofable first one', () => {
    const req = new NextRequest('http://localhost/api/x', {
      headers: { 'x-forwarded-for': '6.6.6.6, 203.0.113.7' },
    })
    expect(getClientIp(req)).toBe('203.0.113.7')
  })
})

describe('rateLimit', () => {
  it('cannot be bypassed by rotating a client-supplied X-Forwarded-For prefix', () => {
    const limiter = rateLimit(2, 60_000)
    const make = (fake: string) =>
      new NextRequest('http://localhost/api/auth/login', {
        headers: { 'x-forwarded-for': `${fake}, 203.0.113.7` },
      })

    expect(limiter(make('1.1.1.1'))).toBeNull()
    expect(limiter(make('2.2.2.2'))).toBeNull()
    expect(limiter(make('3.3.3.3'))?.status).toBe(429)
  })
})

describe('getSafeRedirectPath', () => {
  const origin = 'https://weggo.example'

  it('allows same-origin relative paths', () => {
    expect(getSafeRedirectPath('/profile?tab=1', origin)).toBe('/profile?tab=1')
  })

  it.each(['//evil.com', '/\\evil.com', '/\\/evil.com', 'https://evil.com', '/\t/evil.com', ''])(
    'rejects %j',
    (value) => {
      expect(getSafeRedirectPath(value, origin)).toBeNull()
    }
  )
})

describe('validateCsrfRequest', () => {
  it('rejects mismatched tokens and accepts matching ones', () => {
    const bad = new NextRequest('http://localhost/api/x', {
      method: 'POST',
      headers: { cookie: 'csrfToken=abc', 'x-csrf-token': 'abd' },
    })
    expect(validateCsrfRequest(bad)?.status).toBe(403)

    const multibyte = new NextRequest('http://localhost/api/x', {
      method: 'POST',
      headers: { cookie: 'csrfToken=abc', 'x-csrf-token': 'ab%C3%A9' },
    })
    expect(validateCsrfRequest(multibyte)?.status).toBe(403)

    const good = new NextRequest('http://localhost/api/x', {
      method: 'POST',
      headers: { cookie: 'csrfToken=abc', 'x-csrf-token': 'abc' },
    })
    expect(validateCsrfRequest(good)).toBeNull()
  })
})

describe('parsePricingInput', () => {
  it('rejects non-string values that could become query operators', () => {
    expect(parsePricingInput({ title: 'x', category: { $ne: null }, condition: 'good' })).toBeNull()
  })

  it('accepts bounded strings', () => {
    expect(parsePricingInput({ title: 'Phone', category: 'electronics', condition: 'good' })).toEqual({
      title: 'Phone',
      description: '',
      category: 'electronics',
      condition: 'good',
    })
  })
})

describe('proxy admin gate', () => {
  let proxy: (req: NextRequest) => Promise<Response>

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_SECRET
    ;({ proxy } = await import('@/proxy'))
  })

  const request = (token: string) =>
    new NextRequest('http://localhost/api/admin/users', { headers: { cookie: `token=${token}` } })

  it('rejects an unsigned token that merely claims admin', async () => {
    const forged = jwt.sign({ userId: 'x', role: 'admin' }, 'attacker-secret')
    const response = await proxy(request(forged))
    expect(response.status).toBe(404)
  })

  it('rejects alg=none tokens', async () => {
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify({ role: 'admin' })).toString('base64url')
    const response = await proxy(request(`${header}.${payload}.`))
    expect(response.status).toBe(404)
  })

  it('lets a correctly signed admin token through', async () => {
    const valid = jwt.sign({ userId: 'x', role: 'admin' }, TEST_SECRET, { algorithm: 'HS256', expiresIn: '1h' })
    const response = await proxy(request(valid))
    expect(response.status).toBe(200)
  })

  it('rejects an expired admin token', async () => {
    const expired = jwt.sign(
      { userId: 'x', role: 'admin', exp: Math.floor(Date.now() / 1000) - 60 },
      TEST_SECRET,
      { algorithm: 'HS256' }
    )
    const response = await proxy(request(expired))
    expect(response.status).toBe(404)
  })
})

describe('saveImage', () => {
  it('derives the stored extension from the verified type, not the client filename', async () => {
    const fs = await import('fs')
    const os = await import('os')
    const path = await import('path')
    const { saveImage } = await import('@/lib/imageUpload')

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'weggo-upload-'))
    const cwd = process.cwd()
    process.chdir(tmp)
    try {
      const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0])
      const file = new File([jpegBytes], 'payload.html', { type: 'image/jpeg' })
      const saved = await saveImage(file, 'user1', 'product1')
      expect(saved).toMatch(/\.jpg$/)
      expect(saved).not.toContain('.html')

      await expect(saveImage(file, '../etc', 'product1')).rejects.toThrow('Invalid upload path')
    } finally {
      process.chdir(cwd)
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})
