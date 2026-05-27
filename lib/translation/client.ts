import { getCircuitBreaker } from '@/lib/services/circuit-breaker'
import { getLimiter } from '@/lib/services/concurrency'
import { requestJson } from '@/lib/services/http-client'
import type { TranslationServiceBatchRequest, TranslationServiceBatchResponse } from '@/types/ai'

const breaker = getCircuitBreaker('translation')
const limiter = getLimiter('translation', 8)

function getTranslationApiUrl() {
  const url = process.env.TRANSLATION_API_URL?.trim()
  if (!url) {
    throw new Error('TRANSLATION_API_URL is not configured')
  }

  return url.replace(/\/+$/, '')
}

function getInternalHeaders() {
  const token = process.env.INTERNAL_SERVICE_TOKEN?.trim()
  return token ? { 'X-Internal-Auth': token } : undefined
}

export async function translateListings(
  listings: TranslationServiceBatchRequest,
  signal?: AbortSignal
): Promise<TranslationServiceBatchResponse> {
  if (listings.length === 0) return []

  const baseUrl = getTranslationApiUrl()

  return limiter(() =>
    breaker.run('translation service', () =>
      requestJson<TranslationServiceBatchResponse>(`${baseUrl}/translate/listings`, {
        method: 'POST',
        body: listings,
        headers: getInternalHeaders(),
        timeoutMs: 60_000,
        idempotent: true,
        retries: 1,
        signal,
      })
    )
  )
}
