import { Agent, Headers } from 'undici'

if (typeof window !== 'undefined') {
  throw new Error('Service clients are server-only. Call via /api/* route.')
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export interface ServiceCallOptions {
  body?: unknown
  headers?: Record<string, string>
  idempotent?: boolean
  method?: HttpMethod
  retries?: number
  signal?: AbortSignal
  timeoutMs: number
}

export class ServiceHttpError extends Error {
  status: number
  payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = 'ServiceHttpError'
    this.status = status
    this.payload = payload
  }
}

const agent = new Agent({
  keepAliveTimeout: 30_000,
  keepAliveMaxTimeout: 60_000,
  connections: 64,
  pipelining: 1,
  // Per-call timeouts are enforced via AbortController in createTimeoutSignal,
  // so the agent-level timeouts must be permissive. The translation batch
  // endpoint can take 30s+ before sending headers when the GPU is warming up.
  headersTimeout: 120_000,
  bodyTimeout: 120_000,
})

function createTimeoutSignal(timeoutMs: number, signal?: AbortSignal) {
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort(new Error(`Upstream request timed out after ${timeoutMs}ms`))
  }, timeoutMs)

  const abortFromParent = () => {
    controller.abort(signal?.reason || new Error('Upstream request aborted'))
  }

  if (signal) {
    if (signal.aborted) {
      abortFromParent()
    } else {
      signal.addEventListener('abort', abortFromParent, { once: true })
    }
  }

  const cleanup = () => {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abortFromParent)
  }

  return { cleanup, signal: controller.signal }
}

function buildHeaders(body: unknown, headers?: Record<string, string>) {
  const merged = new Headers(headers)

  if (body !== undefined && !merged.has('content-type')) {
    merged.set('content-type', 'application/json')
  }

  return merged
}

async function parseResponsePayload(response: Response) {
  const rawText = await response.text()
  if (!rawText) return null

  try {
    return JSON.parse(rawText) as unknown
  } catch {
    return rawText
  }
}

function getErrorMessage(payload: unknown, status: number) {
  if (payload && typeof payload === 'object') {
    const candidate = payload as Record<string, unknown>
    const message =
      (typeof candidate.error === 'string' && candidate.error) ||
      (typeof candidate.detail === 'string' && candidate.detail) ||
      (typeof candidate.message === 'string' && candidate.message)

    if (message) return message
  }

  if (typeof payload === 'string' && payload.trim()) {
    return payload
  }

  return `Upstream service returned ${status}`
}

async function executeRequest(url: string, options: ServiceCallOptions): Promise<Response> {
  const { body, headers, method = body === undefined ? 'GET' : 'POST', signal, timeoutMs } = options
  const { cleanup, signal: timeoutSignal } = createTimeoutSignal(timeoutMs, signal)

  try {
    return await globalThis.fetch(url, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: buildHeaders(body, headers),
      cache: 'no-store',
      dispatcher: agent,
      signal: timeoutSignal,
    } as RequestInit & { dispatcher: Agent })
  } finally {
    cleanup()
  }
}

export async function requestJson<T>(url: string, options: ServiceCallOptions): Promise<T> {
  const maxAttempts = options.idempotent ? Math.max(1, (options.retries ?? 0) + 1) : 1
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await executeRequest(url, options)
      const payload = await parseResponsePayload(response)

      if (!response.ok) {
        throw new ServiceHttpError(getErrorMessage(payload, response.status), response.status, payload)
      }

      return payload as T
    } catch (error) {
      lastError = error
      if (attempt >= maxAttempts) break

      const isRetryableStatus = error instanceof ServiceHttpError && error.status >= 500
      const isAbort = error instanceof Error && error.name === 'AbortError'
      if (!isRetryableStatus && !isAbort) break
    }
  }

  throw lastError
}

export async function requestStream(url: string, options: ServiceCallOptions): Promise<Response> {
  const response = await executeRequest(url, options)

  if (!response.ok) {
    const payload = await parseResponsePayload(response)
    throw new ServiceHttpError(getErrorMessage(payload, response.status), response.status, payload)
  }

  return response
}
