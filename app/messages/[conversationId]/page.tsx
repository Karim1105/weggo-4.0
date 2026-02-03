'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, MessageCircle, User, Clock, Shield } from 'lucide-react'
import { withCsrfHeader } from '@/lib/utils'

interface UserLite {
  _id: string
  name: string
  email?: string
  avatar?: string
}

interface ProductLite {
  _id: string
  title: string
  price: number
  images?: string[]
}

interface Message {
  _id: string
  conversationId: string
  content: string
  createdAt: string
  sender: UserLite
  receiver: UserLite
  product?: ProductLite
}

export default function ConversationPage() {
  const params = useParams()
  const router = useRouter()
  const conversationId = params.conversationId as string

  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [blocking, setBlocking] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const meRes = await fetch('/api/auth/me', { credentials: 'include' })
        if (meRes.status === 401) {
          router.push(`/login?redirect=/messages/${encodeURIComponent(conversationId)}`)
          return
        }
        const meData = await meRes.json()
        if (meData.success && meData.user) {
          setCurrentUserId(meData.user.id || meData.user._id)
        }

        const res = await fetch(
          `/api/messages?conversationId=${encodeURIComponent(conversationId)}`,
          { credentials: 'include' }
        )
        const data = await res.json()
        if (!data.success) {
          setError(data.error || 'Failed to load conversation')
          return
        }
        setMessages(data.messages || [])
      } catch {
        setError('Failed to load conversation')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [conversationId, router])

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || messages.length === 0 || !currentUserId) return

    const first = messages[0]
    const isSender = first.sender._id === currentUserId
    const otherUser = isSender ? first.receiver : first.sender
    const product = first.product

    setSending(true)
    setSendError(null)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          receiverId: otherUser._id,
          productId: product?._id,
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
    } catch (err) {
      setSendError('Failed to send message. Please check your connection.')
      console.error('Send message error:', err)
    } finally {
      setSending(false)
    }
  }

  const handleBlock = async () => {
    if (!currentUserId || messages.length === 0) return
    const first = messages[0]
    const isSender = first.sender._id === currentUserId
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
        body: JSON.stringify({ userId: otherUser._id }),
      })
      const data = await res.json()
      if (!data.success) return
      router.push('/messages')
      router.refresh()
    } finally {
      setBlocking(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center justify-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Link
          href="/messages"
          className="text-primary-600 hover:underline flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to messages
        </Link>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center justify-center">
        <p className="text-gray-600 mb-4">No messages in this conversation yet.</p>
        <Link
          href="/messages"
          className="text-primary-600 hover:underline flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to messages
        </Link>
      </div>
    )
  }

  const first = messages[0]
  const isSender = currentUserId && first.sender._id === currentUserId
  const otherUser = isSender ? first.receiver : first.sender

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 bg-gray-50">
      <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/messages"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-gray-500" />
            <span className="font-semibold text-gray-900">
              {otherUser.name || otherUser.email}
            </span>
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
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => {
              const mine = currentUserId && msg.sender._id === currentUserId
              const time = new Date(msg.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
              return (
                <div
                  key={msg._id}
                  className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs rounded-2xl px-4 py-2 text-sm shadow-sm ${
                      mine
                        ? 'bg-primary-600 text-white rounded-br-none'
                        : 'bg-gray-100 text-gray-900 rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <div className="mt-1 flex items-center gap-1 text-[11px] opacity-80">
                      <Clock className="w-3 h-3" />
                      <span>{time}</span>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={handleSend}
            className="border-t border-gray-200 p-3 bg-white flex flex-col gap-2"
          >
            {sendError && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {sendError}
              </div>
            )}
            <div className="flex items-center gap-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={1}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
              <motion.button
                type="submit"
                disabled={sending || !replyText.trim()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary-600 text-white font-medium disabled:opacity-60"
              >
                <MessageCircle className="w-5 h-5 mr-1" />
                {sending ? 'Sending...' : 'Send'}
              </motion.button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

