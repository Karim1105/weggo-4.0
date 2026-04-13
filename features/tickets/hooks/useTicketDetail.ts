'use client'

import { useCallback, useEffect, useState } from 'react'
import { getAdminTicketDetail, getUserTicketDetail, replyToTicket, updateTicketStatus } from '@/services/api/tickets'

interface UseTicketDetailOptions {
  ticketId: string
  admin?: boolean
}

export function useTicketDetail({ ticketId, admin = false }: UseTicketDetailOptions) {
  const [ticket, setTicket] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = admin ? await getAdminTicketDetail(ticketId) : await getUserTicketDetail(ticketId)
      setTicket(response.data.ticket)
      setMessages(response.data.messages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ticket')
    } finally {
      setLoading(false)
    }
  }, [admin, ticketId])

  useEffect(() => {
    if (!ticketId) return
    load()
  }, [load, ticketId])

  const sendReply = async (payload: { message: string; attachments: File[] }) => {
    setSending(true)
    try {
      await replyToTicket({ ticketId, message: payload.message, attachments: payload.attachments, admin })
      await load()
    } finally {
      setSending(false)
    }
  }

  const setStatus = async (status: 'open' | 'pending' | 'resolved' | 'closed') => {
    setUpdatingStatus(true)
    try {
      await updateTicketStatus({ ticketId, status, admin })
      await load()
    } finally {
      setUpdatingStatus(false)
    }
  }

  return {
    ticket,
    messages,
    loading,
    sending,
    updatingStatus,
    error,
    load,
    sendReply,
    setStatus,
  }
}
