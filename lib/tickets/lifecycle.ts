import { TicketStatus } from '@/models/Ticket'

const ALLOWED_NEXT_STATUSES: Record<TicketStatus, TicketStatus[]> = {
  open: ['pending', 'resolved', 'closed'],
  pending: ['resolved', 'closed'],
  resolved: ['closed'],
  closed: [],
}

export function canTransitionTicketStatus(currentStatus: TicketStatus, nextStatus: TicketStatus) {
  if (currentStatus === nextStatus) return true
  return ALLOWED_NEXT_STATUSES[currentStatus].includes(nextStatus)
}
