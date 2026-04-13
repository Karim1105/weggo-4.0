import { withCsrfHeader } from '@/lib/utils'

export class ApiClientError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
  }
}

export async function adminFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : null),
      ...withCsrfHeader(init?.headers),
    },
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok || !payload?.success) {
    throw new ApiClientError(payload?.error || 'Request failed', response.status)
  }

  return payload as T
}
