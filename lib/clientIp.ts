import type { NextRequest } from 'next/server'

/**
 * Resolve the client IP for rate limiting.
 *
 * The reverse proxy (nginx, see docs/DEPLOY_DROPLET.md) sets `X-Real-IP` to
 * `$remote_addr` and *appends* the real peer to `X-Forwarded-For`. Anything
 * earlier in `X-Forwarded-For` is client-controlled, so trusting the first
 * entry lets an attacker rotate fake IPs and bypass every rate limit.
 */
export function getClientIp(request: NextRequest): string {
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp

  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const parts = forwarded.split(',').map((part) => part.trim()).filter(Boolean)
    const last = parts[parts.length - 1]
    if (last) return last
  }

  return 'unknown'
}
