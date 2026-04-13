import { withCsrfHeader } from '@/lib/utils'
import { TicketStatus } from '@/types/tickets'

async function parseResponse<T>(res: Response): Promise<T> {
  const payload = await res.json().catch(() => null)
  if (!res.ok || !payload?.success) {
    throw new Error(payload?.error || 'Request failed')
  }
  return payload as T
}

export async function createTicket(input: { subject: string; message: string; attachments: File[] }) {
  const formData = new FormData()
  formData.set('subject', input.subject)
  formData.set('message', input.message)
  input.attachments.forEach((file) => formData.append('attachments', file))

  const res = await fetch('/api/tickets', {
    method: 'POST',
    credentials: 'include',
    headers: withCsrfHeader(),
    body: formData,
  })

  return parseResponse<{ success: true; data: { ticketId: string } }>(res)
}

export async function getUserTickets(params: { page?: number; limit?: number }) {
  const query = new URLSearchParams()
  query.set('page', String(params.page || 1))
  query.set('limit', String(params.limit || 10))

  const res = await fetch(`/api/tickets?${query.toString()}`, { credentials: 'include' })
  return parseResponse<any>(res)
}

export async function getUserTicketDetail(ticketId: string) {
  const res = await fetch(`/api/tickets/${ticketId}`, { credentials: 'include' })
  return parseResponse<any>(res)
}

export async function replyToTicket(input: { ticketId: string; message: string; attachments: File[]; admin?: boolean }) {
  const formData = new FormData()
  formData.set('message', input.message)
  input.attachments.forEach((file) => formData.append('attachments', file))

  const prefix = input.admin ? '/api/admin/tickets' : '/api/tickets'
  const suffix = input.admin ? 'reply' : 'reply'

  const res = await fetch(`${prefix}/${input.ticketId}/${suffix}`, {
    method: 'POST',
    credentials: 'include',
    headers: withCsrfHeader(),
    body: formData,
  })

  return parseResponse<any>(res)
}

export async function updateTicketStatus(input: { ticketId: string; status: TicketStatus; admin?: boolean }) {
  const prefix = input.admin ? '/api/admin/tickets' : '/api/tickets'

  const res = await fetch(`${prefix}/${input.ticketId}/status`, {
    method: 'PATCH',
    credentials: 'include',
    headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ status: input.status }),
  })

  return parseResponse<any>(res)
}

export async function getAdminTickets(params: { page?: number; limit?: number; status?: string; search?: string }) {
  const query = new URLSearchParams()
  query.set('page', String(params.page || 1))
  query.set('limit', String(params.limit || 15))
  if (params.status && params.status !== 'all') query.set('status', params.status)
  if (params.search) query.set('search', params.search)

  const res = await fetch(`/api/admin/tickets?${query.toString()}`, { credentials: 'include' })
  return parseResponse<any>(res)
}

export async function getAdminTicketDetail(ticketId: string) {
  const res = await fetch(`/api/admin/tickets/${ticketId}`, { credentials: 'include' })
  return parseResponse<any>(res)
}
