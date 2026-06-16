import { createHmac, timingSafeEqual } from 'crypto'

/**
 * National ID protection.
 *
 * Egyptian national IDs are 14 digits (`^[23]\d{13}$`), a search space small
 * enough (~2x10^13) that a plain SHA-256 hash would be brute-forceable. We
 * therefore store a keyed HMAC-SHA256 ("peppered hash") using a server-only
 * secret. The hash is:
 *   - irreversible without the secret (safe at rest / on breach),
 *   - deterministic (so duplicate submissions can be detected by comparing
 *     hashes if that is ever needed).
 *
 * The plaintext national ID is never persisted. It is validated on submission
 * and then immediately hashed.
 */

const MIN_SECRET_LENGTH = 16

export function getNationalIdHashSecret(): string {
  const secret = process.env.NATIONAL_ID_HASH_SECRET
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `NATIONAL_ID_HASH_SECRET is missing or too weak (minimum ${MIN_SECRET_LENGTH} characters). ` +
        'Set a high-entropy value, e.g. `openssl rand -hex 32`.'
    )
  }
  return secret
}

export function normalizeNationalId(raw: string): string {
  return (raw || '').trim()
}

/**
 * Compute the peppered HMAC-SHA256 hash (hex) of a national ID.
 * Throws if the server secret is not configured.
 */
export function hashNationalId(nationalId: string): string {
  const normalized = normalizeNationalId(nationalId)
  return createHmac('sha256', getNationalIdHashSecret()).update(normalized).digest('hex')
}

/**
 * Constant-time comparison of a plaintext national ID against a stored hash.
 */
export function nationalIdHashMatches(nationalId: string, storedHash: string): boolean {
  const computed = Buffer.from(hashNationalId(nationalId), 'utf8')
  const stored = Buffer.from(storedHash || '', 'utf8')
  if (computed.length !== stored.length) return false
  return timingSafeEqual(computed, stored)
}
