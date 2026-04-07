import { describe, it, expect, vi, afterEach } from 'vitest'
import { validateEnvironment } from '@/lib/env'

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  vi.restoreAllMocks()
})

describe('environment validation', () => {
  it('throws when required core environment variables are missing', () => {
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'production',
      MONGODB_URI: '',
      JWT_SECRET: '',
    }

    expect(() => validateEnvironment()).toThrow(/MONGODB_URI, JWT_SECRET/)
  })

  it('warns instead of throwing when recommended production URLs are missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://localhost:27017/test',
      JWT_SECRET: 'secret',
      NEXT_PUBLIC_SITE_URL: '',
      NEXT_PUBLIC_APP_URL: '',
    }

    expect(() => validateEnvironment()).not.toThrow()
    expect(warn).toHaveBeenCalledWith(
      '[env] Recommended production environment variables missing: NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_APP_URL'
    )
  })

  it('rejects partial SMTP configuration', () => {
    process.env = {
      ...ORIGINAL_ENV,
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://localhost:27017/test',
      JWT_SECRET: 'secret',
      SMTP_HOST: 'smtp.example.com',
      SMTP_USER: 'user@example.com',
      SMTP_PASS: '',
      SMTP_PORT: '',
    }

    expect(() => validateEnvironment()).toThrow(/Incomplete SMTP configuration/)
  })
})
