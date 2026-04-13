'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import TicketComposer from '@/components/tickets/TicketComposer'
import TicketMessageBubble from '@/components/tickets/TicketMessageBubble'
import TicketStatusBadge from '@/components/tickets/TicketStatusBadge'
import { useTicketDetail } from '@/features/tickets/hooks/useTicketDetail'

export default function SupportTicketDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const ticketId = params.id

  const { ticket, messages, loading, error, sending, updatingStatus, sendReply, setStatus } = useTicketDetail({ ticketId })

  if (loading) {
    return <div className="min-h-screen px-4 pb-12 pt-24 text-sm text-gray-500">Loading ticket...</div>
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen px-4 pb-12 pt-24">
        <p className="text-sm text-red-600">{error || 'Ticket not found'}</p>
        <Link href="/support" className="mt-3 inline-block text-sm font-semibold text-indigo-600">Back to support</Link>
      </div>
    )
  }

  const isClosed = ticket.status === 'closed'

  return (
    <div className="min-h-screen bg-gray-50 px-4 pb-12 pt-24">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="rounded-2xl border bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-gray-900">{ticket.subject}</p>
              <p className="text-xs text-gray-500">Ticket #{ticket._id}</p>
            </div>
            <TicketStatusBadge status={ticket.status} />
          </div>

          <div className="mt-4 flex gap-2">
            <button
              disabled={updatingStatus || isClosed}
              onClick={async () => {
                if (!window.confirm('Close this ticket? It will become read-only.')) return
                try {
                  await setStatus('closed')
                  toast.success('Ticket closed')
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Failed to close ticket')
                }
              }}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-60"
            >
              {updatingStatus ? 'Updating...' : isClosed ? 'Closed' : 'Close ticket'}
            </button>
            <button onClick={() => router.push('/support')} className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-indigo-600">
              Back to all tickets
            </button>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border bg-gray-100 p-4">
          {messages.map((message) => (
            <TicketMessageBubble
              key={message._id}
              mine={message.senderRole === 'user'}
              senderLabel={message.senderRole === 'user' ? 'You' : 'Support'}
              message={message.message}
              attachments={message.attachments || []}
              createdAt={message.createdAt}
            />
          ))}
        </div>

        <TicketComposer
          loading={sending}
          disabled={isClosed}
          submitLabel={isClosed ? 'Ticket closed' : 'Send reply'}
          onSubmit={async ({ message, attachments }) => {
            try {
              await sendReply({ message, attachments })
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Failed to send reply')
            }
          }}
        />
      </div>
    </div>
  )
}
