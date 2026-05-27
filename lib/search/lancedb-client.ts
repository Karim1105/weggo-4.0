import crypto from 'crypto'
import { getCircuitBreaker } from '@/lib/services/circuit-breaker'
import { getLimiter } from '@/lib/services/concurrency'
import { requestJson, ServiceHttpError } from '@/lib/services/http-client'
import { BoundedLruCache } from '@/lib/services/lru-cache'
import { singleFlight } from '@/lib/services/single-flight'
import type {
  LancedbBatchUpsertRequest,
  LancedbBatchUpsertResponse,
  LancedbDeleteResponse,
  LancedbExistsRequest,
  LancedbExistsResponse,
  LancedbListingPayload,
  LancedbSearchRequest,
  LancedbSearchResponse,
} from '@/types/ai'

const breaker = getCircuitBreaker('lancedb')
const readLimiter = getLimiter('lancedb-read', 16)
const writeLimiter = getLimiter('lancedb-write', 1)
const searchCache = new BoundedLruCache<string, string[]>(5_000, 60_000)

function sha1(value: string) {
  return crypto.createHash('sha1').update(value).digest('hex')
}

function getInternalHeaders() {
  const token = process.env.INTERNAL_SERVICE_TOKEN?.trim()
  return token ? { 'X-Internal-Auth': token } : undefined
}

function getLancedbApiUrl() {
  const url = process.env.LANCEDB_API_URL?.trim()
  if (!url) {
    throw new Error('LANCEDB_API_URL is not configured')
  }

  return url.replace(/\/+$/, '')
}

export async function upsertLancedbListings(listings: LancedbListingPayload[]) {
  if (listings.length === 0) {
    return { upserted: [] } satisfies LancedbBatchUpsertResponse
  }

  const baseUrl = getLancedbApiUrl()
  const body: LancedbBatchUpsertRequest = { listings }

  return writeLimiter(() =>
    breaker.run('lancedb service', () =>
      requestJson<LancedbBatchUpsertResponse>(`${baseUrl}/listings/batch`, {
        method: 'POST',
        body,
        headers: getInternalHeaders(),
        timeoutMs: 30_000,
        idempotent: true,
        retries: 1,
      })
    )
  )
}

export async function deleteLancedbListing(listingId: string) {
  const baseUrl = getLancedbApiUrl()

  return writeLimiter(() =>
    breaker.run('lancedb service', () =>
      requestJson<LancedbDeleteResponse>(`${baseUrl}/listings/${listingId}`, {
        method: 'DELETE',
        headers: getInternalHeaders(),
        timeoutMs: 15_000,
        idempotent: true,
        retries: 1,
      })
    )
  )
}

export async function hybridSearchLancedb(request: LancedbSearchRequest) {
  const key = `search:${sha1(JSON.stringify(request))}`
  const cached = searchCache.get(key)
  if (cached) return cached

  const baseUrl = getLancedbApiUrl()

  return singleFlight(key, () =>
    searchCache.getOrCompute(key, async () =>
      readLimiter(() =>
        breaker.run('lancedb service', async () => {
          const response = await requestJson<LancedbSearchResponse>(`${baseUrl}/listings/search`, {
            method: 'POST',
            body: request,
            headers: getInternalHeaders(),
            timeoutMs: 2_000,
            idempotent: true,
            retries: 1,
          })
          return Array.isArray(response.results) ? response.results : []
        })
      )
    )
  )
}

export async function getExistingLancedbIds(ids: string[]) {
  if (ids.length === 0) return []
  const baseUrl = getLancedbApiUrl()
  const body: LancedbExistsRequest = { ids }

  return readLimiter(() =>
    breaker.run('lancedb service', async () => {
      try {
        const response = await requestJson<LancedbExistsResponse>(`${baseUrl}/listings/exists`, {
          method: 'POST',
          body,
          headers: getInternalHeaders(),
          timeoutMs: 5_000,
          idempotent: true,
          retries: 1,
        })
        return Array.isArray(response.existing_ids) ? response.existing_ids : []
      } catch (error) {
        // Fresh deploys have no table until the first upsert; the service
        // returns 409 with "Table does not exist yet". For an exists-check
        // that's just "nothing exists yet" — return [] so the reconciler
        // can proceed to queue all listings for upsert.
        if (error instanceof ServiceHttpError && error.status === 409) return []
        throw error
      }
    })
  )
}
