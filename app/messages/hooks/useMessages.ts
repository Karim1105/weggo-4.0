'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ConversationDTO, ConversationsResponseDTO, PaginationMeta } from '@/types/messages'

interface AuthMeResponse {
  success?: boolean
  user?: { id?: string; _id?: string }
}

interface ErrorResponse {
  success?: false
  error?: string
}

function upsertConversations(current: ConversationDTO[], incoming: ConversationDTO[]): ConversationDTO[] {
  const map = new Map<string, ConversationDTO>()
  current.forEach((item) => map.set(item.conversationId, item))
  incoming.forEach((item) => map.set(item.conversationId, item))
  return [...map.values()]
}

async function safeJson<T>(response: Response, fallback: T): Promise<T> {
  try {
    return (await response.json()) as T
  } catch {
    return fallback
  }
}

export function useMessages() {
  const router = useRouter()
  const [conversations, setConversations] = useState<ConversationDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefetching, setIsRefetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: false,
  })

  const fetchPage = useCallback(
    async (page: number, mode: 'replace' | 'append') => {
      if (mode === 'replace') {
        setLoading(true)
      } else {
        setIsRefetching(true)
      }

      try {
        const [meRes, convRes] = await Promise.all([
          fetch('/api/auth/me', { credentials: 'include' }),
          fetch(`/api/messages?page=${page}&pageSize=20`, { credentials: 'include' }),
        ])

        if (meRes.status === 401 || convRes.status === 401) {
          router.push('/login?redirect=/messages')
          return
        }

        const meData = await safeJson<AuthMeResponse>(meRes, {})
        const convData = await safeJson<ConversationsResponseDTO | ErrorResponse>(convRes, {})

        if (meData.success && meData.user) {
          setCurrentUserId(meData.user.id || meData.user._id || null)
        }

        if (!convRes.ok || !('success' in convData) || convData.success !== true) {
          setError(('error' in convData && convData.error) || 'Failed to load messages')
          return
        }

        setConversations((prev) =>
          mode === 'replace'
            ? convData.conversations
            : upsertConversations(prev, convData.conversations)
        )
        setPagination(convData.pagination)
        setError(null)
      } catch {
        setError('Failed to load messages')
      } finally {
        setLoading(false)
        setIsRefetching(false)
      }
    },
    [router]
  )

  useEffect(() => {
    fetchPage(1, 'replace')
  }, [fetchPage])

  const loadMore = useCallback(() => {
    if (!pagination.hasMore || isRefetching) return
    const nextPage = pagination.page + 1
    fetchPage(nextPage, 'append')
  }, [fetchPage, isRefetching, pagination.hasMore, pagination.page])

  const refetch = useCallback(() => {
    fetchPage(1, 'replace')
  }, [fetchPage])

  const markConversationReadOptimistic = useCallback((conversationId: string) => {
    let delta = 0

    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.conversationId !== conversationId) return conversation
        delta = conversation.unreadCount
        return {
          ...conversation,
          unreadCount: 0,
        }
      })
    )

    if (delta > 0 && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('messages:unread:update', { detail: { delta: -delta } })
      )
    }
  }, [])

  const sortedConversations = useMemo(
    () =>
      [...conversations].sort((a, b) => {
        const left = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0
        const right = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0
        return right - left
      }),
    [conversations]
  )

  const totalUnread = useMemo(
    () => conversations.reduce((sum, item) => sum + item.unreadCount, 0),
    [conversations]
  )

  return {
    loading,
    error,
    isRefetching,
    isEmpty: !loading && !error && sortedConversations.length === 0,
    conversations: sortedConversations,
    totalUnread,
    currentUserId,
    hasMore: pagination.hasMore,
    loadMore,
    refetch,
    markConversationReadOptimistic,
  }
}
