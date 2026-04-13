'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import TicketComposer from '@/components/tickets/TicketComposer'
import TicketMessageBubble from '@/components/tickets/TicketMessageBubble'
import TicketStatusBadge from '@/components/tickets/TicketStatusBadge'
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/AsyncStates'
import { TablePagination } from '@/components/admin/TablePagination'
import { useTicketDetail } from '@/features/tickets/hooks/useTicketDetail'
import { getAdminTickets } from '@/services/api/tickets'

interface TicketsModuleProps {
  refreshTick: number
}

export default function TicketsModule({ refreshTick }: TicketsModuleProps) {
  const [tickets, setTickets] = useState<any[]>([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const {
    ticket,
    messages,
    loading: loadingDetail,
    sending,
    updatingStatus,
    sendReply,
    setStatus: setTicketStatus,
    load,
  } = useTicketDetail({ ticketId: selectedId || '', admin: true })

  const loadTickets = async (page = 1, nextStatus = status, nextSearch = search) => {
    setLoading(true)
    setError(null)
    try {
      const response = await getAdminTickets({ page, limit: 15, status: nextStatus, search: nextSearch })
      setTickets(response.data.tickets)
      setPagination(response.data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTickets(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick])

  if (loading) return <LoadingState label="Loading tickets..." />
  if (error) return <ErrorState message={error} />

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 rounded-xl border bg-white p-4 md:grid-cols-[200px,1fr,120px]">
        <select
          value={status}
          onChange={(event) => {
            const next = event.target.value
            setStatus(next)
            void loadTickets(1, next, search)
          }}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by subject, user or email"
          className="rounded-lg border px-3 py-2 text-sm"
        />

        <button
          onClick={() => void loadTickets(1, status, search)}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"
        >
          Search
        </button>
      </div>

      {tickets.length === 0 ? (
        <EmptyState title="No tickets found" subtitle="Try changing filters." />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px]">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tickets.map((item) => (
                  <tr key={item._id} className="text-sm">
                    <td className="px-4 py-3 font-semibold text-gray-900">{item.subject}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <p>{item.userId?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{item.userId?.email || '-'}</p>
                    </td>
                    <td className="px-4 py-3"><TicketStatusBadge status={item.status} /></td>
                    <td className="px-4 py-3 text-gray-500">{new Date(item.updatedAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedId(item._id)}
                        className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-indigo-600"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            onPageChange={(page) => void loadTickets(page)}
          />
        </div>
      )}

      {selectedId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 px-4 py-8">
          <div className="mx-auto w-full max-w-4xl rounded-xl border bg-white p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">{ticket?.subject || 'Ticket'}</p>
                {ticket?.status ? <TicketStatusBadge status={ticket.status} /> : null}
              </div>
              <button onClick={() => setSelectedId(null)} className="rounded-lg border px-3 py-1 text-xs">Close</button>
            </div>

            {loadingDetail ? (
              <LoadingState label="Loading conversation..." />
            ) : (
              <>
                <div className="max-h-[380px] space-y-3 overflow-y-auto rounded-xl border bg-gray-100 p-3">
                  {messages.map((message) => (
                    <TicketMessageBubble
                      key={message._id}
                      mine={message.senderRole === 'admin'}
                      senderLabel={message.senderRole === 'admin' ? 'Admin' : 'User'}
                      message={message.message}
                      attachments={message.attachments || []}
                      createdAt={message.createdAt}
                    />
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(['pending', 'resolved', 'closed'] as const).map((statusOption) => (
                    <button
                      key={statusOption}
                      disabled={updatingStatus || ticket?.status === statusOption}
                      onClick={async () => {
                        try {
                          await setTicketStatus(statusOption)
                          toast.success(`Ticket marked as ${statusOption}`)
                          await loadTickets(pagination.page)
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : 'Failed to update status')
                        }
                      }}
                      className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-50"
                    >
                      {updatingStatus && ticket?.status !== statusOption ? 'Updating...' : `Set ${statusOption}`}
                    </button>
                  ))}
                </div>

                <div className="mt-3">
                  <TicketComposer
                    loading={sending}
                    disabled={ticket?.status === 'closed'}
                    onSubmit={async ({ message, attachments }) => {
                      try {
                        await sendReply({ message, attachments })
                        await loadTickets(pagination.page)
                        await load()
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Failed to send reply')
                      }
                    }}
                    submitLabel="Reply"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
