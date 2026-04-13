import { adminFetch } from '@/features/admin/services/api-client'
import { AnalyticsPayload, AppealsPayload, ReportsPayload, SellerListingsPayload, SellersPayload, UsersPayload } from '@/features/admin/types'

export async function getAnalytics(refreshTick?: number) {
  const suffix = refreshTick ? `?t=${Date.now()}` : ''
  const res = await adminFetch<{ success: true; analytics: AnalyticsPayload }>(`/api/admin/analytics${suffix}`)
  return res.analytics
}

export async function getUsers(params: { search?: string; status?: string; page?: number; limit?: number; refreshTick?: number }) {
  const query = new URLSearchParams()
  if (params.search) query.set('search', params.search)
  if (params.status && params.status !== 'all') query.set('status', params.status)
  query.set('page', String(params.page || 1))
  query.set('limit', String(params.limit || 10))
  if (params.refreshTick) query.set('t', Date.now().toString())

  const res = await adminFetch<{ success: true; data: UsersPayload }>(`/api/admin/users?${query.toString()}`)
  return res.data
}

export async function banUser(userId: string, reason: string) {
  await adminFetch<{ success: true }>(`/api/admin/ban-user`, {
    method: 'POST',
    body: JSON.stringify({ userId, reason }),
  })
}

export async function unbanUser(userId: string) {
  await adminFetch<{ success: true }>(`/api/admin/unban-user`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
}

export async function getReports(params: { status?: string; page?: number; limit?: number; refreshTick?: number }) {
  const query = new URLSearchParams()
  if (params.status && params.status !== 'all') query.set('status', params.status)
  query.set('page', String(params.page || 1))
  query.set('limit', String(params.limit || 10))
  if (params.refreshTick) query.set('t', Date.now().toString())

  const res = await adminFetch<{ success: true; data: ReportsPayload }>(`/api/admin/reports?${query.toString()}`)
  return res.data
}

export async function reviewReport(reportId: string, action: string, actionTaken?: string) {
  await adminFetch<{ success: true }>(`/api/admin/reports/${reportId}`, {
    method: 'POST',
    body: JSON.stringify({ action, actionTaken: actionTaken || action }),
  })
}

export async function getAppeals(params: { status?: string; page?: number; limit?: number; refreshTick?: number }) {
  const query = new URLSearchParams()
  if (params.status && params.status !== 'all') query.set('status', params.status)
  query.set('page', String(params.page || 1))
  query.set('limit', String(params.limit || 10))
  if (params.refreshTick) query.set('t', Date.now().toString())

  const res = await adminFetch<{ success: true; data: AppealsPayload }>(`/api/admin/ban-appeals?${query.toString()}`)
  return res.data
}

export async function reviewAppeal(appealId: string, action: 'approve' | 'reject', rejectionReason?: string) {
  await adminFetch<{ success: true }>(`/api/admin/ban-appeals/${appealId}`, {
    method: 'POST',
    body: JSON.stringify({ action, rejectionReason }),
  })
}

export async function getSellers(params: { page?: number; limit?: number; refreshTick?: number }) {
  const query = new URLSearchParams()
  query.set('page', String(params.page || 1))
  query.set('limit', String(params.limit || 12))
  if (params.refreshTick) query.set('t', Date.now().toString())

  const res = await adminFetch<{ success: true; data: SellersPayload }>(`/api/admin/sellers?${query.toString()}`)
  return res.data
}

export async function boostListing(listingId: string, action: 'boost' | 'unboost') {
  await adminFetch<{ success: true }>(`/api/admin/listings/${listingId}/boost`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  })
}

export async function getSellerListings(sellerId: string, params: { page?: number; limit?: number; status?: string } = {}) {
  const query = new URLSearchParams()
  query.set('page', String(params.page || 1))
  query.set('limit', String(params.limit || 12))
  if (params.status && params.status !== 'all') query.set('status', params.status)

  const res = await adminFetch<{ success: true; data: SellerListingsPayload }>(
    `/api/admin/sellers/${sellerId}/listings?${query.toString()}`
  )
  return res.data
}
