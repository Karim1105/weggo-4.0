'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, Shield, User } from 'lucide-react'
import { withCsrfHeader } from '@/lib/utils'
import type { MessageDTO } from '@/types/messages'

interface ConversationClientProps {
  conversationId: string
  initialMessages: MessageDTO[]
  initialCursor: string | null
  initialHasMore: boolean
  currentUserId: string
}

function getOutgoingStatus(message: MessageDTO): 'Sent' | 'Received' | 'Read' {
  if (message.read || message.readAt) return 'Read'
  if (message.receivedAt) return 'Received'
  return 'Sent'
}

export default function ConversationClient({
  conversationId,
  initialMessages,
  initialCursor,
  initialHasMore,
  currentUserId,
}: ConversationClientProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<MessageDTO[]>(initialMessages)
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [blocking, setBlocking] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.scrollTop = container.scrollHeight
  }, [])

  const loadOlder = useCallback(async () => {
    if (!hasMore || !nextCursor || loadingOlder) return
    const container = containerRef.current
    if (!container) return

    setLoadingOlder(true)
    const previousHeight = container.scrollHeight

    try {
      const res = await fetch(
        `/api/messages?conversationId=${encodeURIComponent(conversationId)}&cursor=${encodeURIComponent(nextCursor)}&limit=30`,
        { credentials: 'include' }
      )
      const data = await res.json()
      if (!data.success) return

      setMessages((prev) => [...(data.messages || []), ...prev])
      setNextCursor(data.pagination?.cursor ?? null)
      setHasMore(Boolean(data.pagination?.hasMore))

      requestAnimationFrame(() => {
        const updated = containerRef.current
        if (!updated) return
        const nextHeight = updated.scrollHeight
        updated.scrollTop = nextHeight - previousHeight
      })
    } finally {
      setLoadingOlder(false)
    }
  }, [conversationId, hasMore, loadingOlder, nextCursor])

  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container || loadingOlder || !hasMore) return
    if (container.scrollTop <= 40) {
      void loadOlder()
    }
  }, [hasMore, loadOlder, loadingOlder])

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!replyText.trim() || messages.length === 0) return

    const first = messages[0]
    const isSender = first.sender.id === currentUserId
    const otherUser = isSender ? first.receiver : first.sender
    if (otherUser.banned) {
      setSendError('You cannot message a banned user.')
      return
    }

    setSending(true)
    setSendError(null)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          receiverId: otherUser.id,
          productId: first.product?.id,
          content: replyText.trim(),
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setSendError(data.error || 'Failed to send message')
        return
      }

      setMessages((prev) => [...prev, data.message])
      setReplyText('')
      requestAnimationFrame(() => {
        const container = containerRef.current
        if (!container) return
        container.scrollTop = container.scrollHeight
      })
    } catch {
      setSendError('Failed to send message. Please check your connection.')
    } finally {
      setSending(false)
    }
  }

  const handleBlock = async () => {
    if (messages.length === 0) return
    const first = messages[0]
    const isSender = first.sender.id === currentUserId
    const otherUser = isSender ? first.receiver : first.sender

    if (!window.confirm(`Block ${otherUser.name || otherUser.email}? They won't be able to message you.`)) {
      return
    }

    setBlocking(true)
    try {
      const res = await fetch('/api/blocks', {
        method: 'POST',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ userId: otherUser.id }),
      })
      const data = await res.json()
      if (!data.success) return
      router.push('/messages')
      router.refresh()
    } finally {
      setBlocking(false)
    }
  }

  if (messages.length === 0) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center justify-center">
        <p className="text-gray-600 mb-4">No messages in this conversation yet.</p>
        <Link href="/messages" className="text-primary-600 hover:underline flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to messages
        </Link>
      </div>
    )
  }

  const first = messages[0]
  const isSender = first.sender.id === currentUserId
  const otherUser = isSender ? first.receiver : first.sender
  const isOtherUserBanned = Boolean(otherUser.banned)

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 bg-gray-50">
      <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between mb-4">
          <Link href="/messages" className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-gray-500" />
            <span className="font-semibold text-gray-900">{otherUser.name || otherUser.email}</span>
            {isOtherUserBanned && (
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">BANNED</span>
            )}
            <button
              type="button"
              disabled={blocking}
              onClick={handleBlock}
              className="ml-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-red-300 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              title="Block user"
            >
              <Shield className="w-4 h-4" />
              {blocking ? 'Blocking...' : 'Block'}
            </button>
          </div>
        </div>

        <div className="card-modern flex-1 flex flex-col overflow-hidden">
          <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingOlder && <p className="text-center text-xs text-gray-500">Loading older messages...</p>}
            {messages.map((msg) => {
              const mine = msg.sender.id === currentUserId
              const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              return (
                <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-xs rounded-2xl px-4 py-2 text-sm shadow-sm ${
                      mine ? 'bg-primary-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-900 rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <div className="mt-1 flex items-center gap-1 text-[11px] opacity-80">
                      <Clock className="w-3 h-3" />
                      <span>{time}</span>
                      {mine && <span>• {getOutgoingStatus(msg)}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <form onSubmit={handleSend} className="border-t border-gray-200 p-3 bg-white flex flex-col gap-2">
            {isOtherUserBanned && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                You can no longer send messages because this user is banned.
              </div>
            )}
            {sendError && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{sendError}</div>
            )}
            <div className="flex items-center gap-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                disabled={sending || isOtherUserBanned}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2"
                placeholder="Write a message..."
              />
              <button
                type="submit"
                disabled={sending || !replyText.trim() || isOtherUserBanned}
                className="px-4 py-2 rounded-lg bg-primary-600 text-white disabled:opacity-60"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
