'use client'

import Link from 'next/link'
import { useState } from 'react'
import toast from 'react-hot-toast'
import TicketStatusBadge from '@/components/tickets/TicketStatusBadge'
import { TablePagination } from '@/components/admin/TablePagination'
import { useUserTickets } from '@/features/tickets/hooks/useUserTickets'

export default function SupportTicketsPage() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const { tickets, pagination, loading, submitting, error, loadTickets, submitTicket } = useUserTickets()

  return (
    <div className="min-h-screen bg-gray-50 px-4 pb-12 pt-24">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[380px,1fr]">
        <section className="rounded-2xl border bg-white p-5">
          <h1 className="text-lg font-semibold text-gray-900">Contact support</h1>
          <p className="mt-1 text-sm text-gray-500">Create a support ticket and attach screenshots if needed.</p>

          <form
            className="mt-4 space-y-3"
            onSubmit={async (event) => {
              event.preventDefault()
              try {
                await submitTicket({ subject, message, attachments })
                setSubject('')
                setMessage('')
                setAttachments([])
                toast.success('Ticket created successfully')
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Failed to create ticket')
              }
            }}
          >
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Subject"
              required
            />
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              rows={5}
              placeholder="Describe your issue"
              required
            />
            <input
              type="file"
              multiple
              accept="image/*"
              className="block w-full text-xs text-gray-600"
              onChange={(event) => setAttachments(Array.from(event.target.files || []))}
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Create ticket'}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">My tickets</h2>
            <button onClick={() => loadTickets(pagination.page)} className="text-xs font-semibold text-indigo-600">
              Refresh
            </button>
          </div>

          {loading && <p className="text-sm text-gray-500">Loading tickets...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!loading && !error && tickets.length === 0 && (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-500">No tickets yet.</div>
          )}

          {!loading && tickets.length > 0 && (
            <div className="space-y-2">
              {tickets.map((ticket) => (
                <Link
                  key={ticket._id}
                  href={`/support/${ticket._id}`}
                  className="block rounded-xl border p-3 hover:border-indigo-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{ticket.subject}</p>
                      <p className="text-xs text-gray-500">Updated {new Date(ticket.updatedAt).toLocaleString()}</p>
                    </div>
                    <TicketStatusBadge status={ticket.status} />
                  </div>
                </Link>
              ))}

              <div className="pt-2">
                <TablePagination
                  page={pagination.page}
                  pages={pagination.pages}
                  total={pagination.total}
                  onPageChange={(page) => loadTickets(page)}
                />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
