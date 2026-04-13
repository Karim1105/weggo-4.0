'use client'

import { useCallback, useEffect, useState } from 'react'
import { createTicket, getUserTickets } from '@/services/api/tickets'

export function useUserTickets() {
  const [tickets, setTickets] = useState<any[]>([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTickets = useCallback(async (page = 1) => {
    setLoading(true)
    setError(null)
    try {
      const response = await getUserTickets({ page, limit: 10 })
      setTickets(response.data.tickets)
      setPagination(response.data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTickets(1)
  }, [loadTickets])

  const submitTicket = async (payload: { subject: string; message: string; attachments: File[] }) => {
    setSubmitting(true)
    try {
      await createTicket(payload)
      await loadTickets(1)
    } finally {
      setSubmitting(false)
    }
  }

  return {
    tickets,
    pagination,
    loading,
    submitting,
    error,
    loadTickets,
    submitTicket,
  }
}
