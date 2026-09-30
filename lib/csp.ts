import { headers } from 'next/headers'

/**
 * The per-request CSP nonce generated in proxy.ts. Inline <script> and <style>
 * elements are blocked unless they carry it, so pass it to anything that
 * renders or injects one. Server-only.
 */
export async function getCspNonce(): Promise<string | undefined> {
  const nonce = (await headers()).get('x-nonce')
  return nonce || undefined
}
