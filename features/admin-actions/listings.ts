'use client'

import { withCsrfHeader } from '@/lib/utils'

async function parseResponse(res: Response) {
  const payload = await res.json().catch(() => null)
  if (!res.ok || !payload?.success) {
    throw new Error(payload?.error || 'Admin action failed')
  }
  return payload
}

export async function adminDeleteListing(listingId: string) {
  const res = await fetch(`/api/admin/listings/${listingId}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: withCsrfHeader(),
  })

  await parseResponse(res)
}

export async function adminSetFeatured(listingId: string, featured: boolean) {
  const res = await fetch(`/api/admin/listings/${listingId}/boost`, {
    method: 'POST',
    credentials: 'include',
    headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ action: featured ? 'boost' : 'unboost' }),
  })

  await parseResponse(res)
}

export async function adminSetVisibility(listingId: string, visible: boolean) {
  const res = await fetch(`/api/admin/listings/${listingId}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ visible }),
  })

  await parseResponse(res)
}
