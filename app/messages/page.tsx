'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, MessageCircle } from 'lucide-react'
import ConversationItem from '@/components/messages/ConversationItem'
import { useMessages } from '@/app/messages/hooks/useMessages'

function MessagesSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="card-modern p-4 flex gap-4 items-center animate-pulse">
          <div className="w-14 h-14 rounded-xl bg-gray-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 bg-gray-200 rounded" />
            <div className="h-3 w-2/3 bg-gray-100 rounded" />
            <div className="h-3 w-1/2 bg-gray-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function MessagesPage() {
  const router = useRouter()
  const [legacyConversationId, setLegacyConversationId] = useState<string | null>(null)
  const {
    loading,
    error,
    isRefetching,
    isEmpty,
    conversations,
    totalUnread,
    currentUserId,
    hasMore,
    loadMore,
    refetch,
    markConversationReadOptimistic,
  } = useMessages()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const value = new URLSearchParams(window.location.search).get('conversationId')
    setLegacyConversationId(value)
  }, [])

  useEffect(() => {
    if (!legacyConversationId) return
    router.replace(`/messages/${encodeURIComponent(legacyConversationId)}`)
  }, [legacyConversationId, router])

  if (legacyConversationId) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center text-sm text-gray-500">
        Opening conversation...
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <MessagesSkeleton />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center justify-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          type="button"
          onClick={refetch}
          className="mb-4 px-4 py-2 rounded-lg bg-primary-600 text-white"
        >
          Retry
        </button>
        <Link
          href="/browse"
          className="text-primary-600 hover:underline flex items-center gap-2"
        >
          <ArrowRight className="w-4 h-4" /> Go to browse
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-6 h-6 text-primary-600" />
            Messages
          </h1>
          {totalUnread > 0 && (
            <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">
              {totalUnread} unread
            </span>
          )}
        </div>

        {isEmpty ? (
          <div className="card-modern p-8 text-center">
            <p className="text-gray-600 mb-2">You don&apos;t have any messages yet.</p>
            <p className="text-gray-500 text-sm">
              Start a conversation by contacting a seller from a listing page.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => {
              return (
                <ConversationItem
                  key={conv.conversationId}
                  conversation={conv}
                  currentUserId={currentUserId}
                  onOpen={markConversationReadOptimistic}
                />
              )
            })}

            {hasMore && (
              <button
                type="button"
                disabled={isRefetching}
                onClick={loadMore}
                className="w-full py-2 rounded-lg border border-gray-200 bg-white text-gray-700"
              >
                {isRefetching ? 'Loading...' : 'Load more'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
