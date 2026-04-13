export type TicketStatus = 'open' | 'pending' | 'resolved' | 'closed'
export type TicketSenderRole = 'user' | 'admin'

export interface TicketSummary {
  _id: string
  subject: string
  status: TicketStatus
  createdAt: string
  updatedAt: string
  closedAt?: string | null
  unreadByUser?: boolean
  unreadByAdmin?: boolean
  userId?: {
    _id: string
    name: string
    email: string
  }
}

export interface TicketMessageDto {
  _id: string
  ticketId: string
  senderId: string
  senderRole: TicketSenderRole
  message: string
  attachments: string[]
  createdAt: string
}

export interface TicketDetailDto {
  ticket: TicketSummary
  messages: TicketMessageDto[]
}
