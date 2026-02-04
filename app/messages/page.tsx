'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { MessageCircle, Clock, MapPin, User, ArrowRight } from 'lucide-react'

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

interface Conversation {
  conversationId: string
  lastMessage: Message
  unreadCount: number
}

export default function MessagesPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, convRes] = await Promise.all([
          fetch('/api/auth/me', { credentials: 'include' }),
          fetch('/api/messages', { credentials: 'include' }),
        ])

        if (meRes.status === 401) {
          router.push('/login?redirect=/messages')
          return
        }
        const meData = await meRes.json()
        if (meData.success && meData.user) {
          setCurrentUserId(meData.user.id || meData.user._id)
        }

        if (convRes.status === 401) {
          router.push('/login?redirect=/messages')
          return
        }
        const data = await convRes.json()
        if (!data.success) {
          setError(data.error || 'Failed to load messages')
          return
        }
        setConversations(data.conversations || [])
      } catch {
        setError('Failed to load messages')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [router])

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
    [conversations]
  )

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

        {conversations.length === 0 ? (
          <div className="card-modern p-8 text-center">
            <p className="text-gray-600 mb-2">You don&apos;t have any messages yet.</p>
            <p className="text-gray-500 text-sm">
              Start a conversation by contacting a seller from a listing page.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => {
              const msg = conv.lastMessage
              if (!msg) return null
              const isSender = currentUserId && msg.sender._id === currentUserId
              const otherUser = isSender ? msg.receiver : msg.sender
              const created = new Date(msg.createdAt)
              const timeLabel = created.toLocaleString()
              const product = msg.product
              const image =
                product?.images && product.images.length > 0
                  ? product.images[0]
                  : undefined

              return (
                <Link
                  key={conv.conversationId}
                  href={`/messages/${encodeURIComponent(conv.conversationId)}`}
                >
                  <motion.div
                    whileHover={{ scale: 1.01, y: -1 }}
                    className={`card-modern p-4 flex gap-4 items-center ${
                      conv.unreadCount > 0 ? 'border-primary-200 bg-primary-50/40' : ''
                    }`}
                  >
                    {image ? (
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                        <img
                          src={image.startsWith('http') || image.startsWith('data:') ? image : `${process.env.NEXT_PUBLIC_APP_URL || ''}${image}`}
                          alt={product?.title || 'Item'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-6 h-6 text-gray-400" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-gray-900 flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="truncate">{otherUser.name || otherUser.email}</span>
                        </p>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeLabel}
                        </span>
                      </div>
                      {product && (
                        <p className="text-xs text-gray-500 mb-1 truncate">
                          Item: {product.title} — {product.price.toLocaleString()} EGP
                        </p>
                      )}
                      <p
                        className={`text-sm truncate ${
                          conv.unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-600'
                        }`}
                      >
                        {isSender ? 'You: ' : ''}{msg.content}
                      </p>
                    </div>

                    {conv.unreadCount > 0 && (
                      <span className="ml-2 px-2 py-1 rounded-full bg-red-500 text-white text-xs font-semibold flex-shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </motion.div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

