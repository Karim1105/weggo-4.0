'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, MessageCircle, Package, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAdminConversationDetail } from '@/features/admin/services/admin-api'
import { AdminConversationDetailPayload } from '@/features/admin/types'
import { listingImageUrl } from '@/lib/utils'

export default function ChatReviewPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const conversationId = params.conversationId as string
  const appealId = searchParams.get('appealId')

  const [conversation, setConversation] = useState<AdminConversationDetailPayload['conversation'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await getAdminConversationDetail(conversationId)
        if (cancelled) return
        setConversation(data.conversation)
      } catch (loadError) {
        if (cancelled) return
        const message = loadError instanceof Error ? loadError.message : 'Failed to load conversation review'
        setError(message)
        toast.error(message)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [conversationId])

  const backHref = appealId ? `/appeal-review/${appealId}` : '/admin?tab=appeals'

  const orderedMessages = useMemo(() => {
    if (!conversation) return []
    return [...conversation.messages].sort(
      (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    )
  }, [conversation])

  if (loading) {
    return <div className="min-h-screen bg-gray-50 px-4 py-20 text-center text-gray-600">Loading conversation review...</div>
  }

  if (!conversation) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-20 text-center">
        <p className="text-gray-700">{error || 'Conversation not found'}</p>
        <button
          onClick={() => router.push(backHref)}
          className="mt-4 rounded-lg border px-4 py-2 text-sm font-semibold text-gray-700"
        >
          Back
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4">
          <button
            onClick={() => router.push(backHref)}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Conversation Review</h1>
            <p className="text-sm text-gray-500">Admin-only full thread view for appeal review.</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        <section className="rounded-xl border bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">Participants</h2>
            </div>
            <p className="text-sm text-gray-500">{conversation.total} messages</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {conversation.participants.map((participant) => (
              <div key={participant._id || participant.email || participant.name} className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-900">{participant.name || 'Unknown user'}</p>
                {participant.email ? <p className="mt-1 text-sm text-gray-500">{participant.email}</p> : null}
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {participant.banned ? 'Banned account' : 'Active account'}
                </p>
              </div>
            ))}
          </div>
        </section>

        {conversation.product ? (
          <section className="rounded-xl border bg-white p-6">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">Listing Context</h2>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-[180px,1fr]">
              <div className="relative overflow-hidden rounded-xl border bg-gray-50">
                {conversation.product.images?.[0] ? (
                  <Image
                    src={listingImageUrl(conversation.product.images[0])}
                    alt={conversation.product.title || 'Listing image'}
                    width={180}
                    height={160}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center text-sm text-gray-400">No listing image</div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{conversation.product.title || 'Unknown listing'}</h3>
                {typeof conversation.product.price === 'number' ? (
                  <p className="mt-2 text-sm text-gray-600">{conversation.product.price.toLocaleString()} EGP</p>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border bg-white p-6">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Full Chat</h2>
          </div>

          <div className="mt-4 space-y-3">
            {orderedMessages.map((message) => (
              <article key={message.id} className="rounded-xl border bg-gray-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{message.sender.name || 'Unknown sender'}</p>
                    <p className="text-xs text-gray-500">
                      To {message.receiver.name || 'Unknown receiver'} • {new Date(message.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-gray-600">
                    {message.read ? 'Read' : 'Unread'}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-gray-800">{message.content || '(No message content)'}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
