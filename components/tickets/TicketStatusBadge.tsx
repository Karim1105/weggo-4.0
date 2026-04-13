import { TicketStatus } from '@/types/tickets'
import { cn } from '@/lib/utils'

const LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  pending: 'Pending',
  resolved: 'Resolved',
  closed: 'Closed',
}

export default function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 text-xs font-semibold',
        status === 'open' && 'bg-blue-100 text-blue-700',
        status === 'pending' && 'bg-amber-100 text-amber-700',
        status === 'resolved' && 'bg-green-100 text-green-700',
        status === 'closed' && 'bg-gray-100 text-gray-600'
      )}
    >
      {LABELS[status]}
    </span>
  )
}
