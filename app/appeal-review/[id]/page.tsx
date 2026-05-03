'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, MessageCircle, Package, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getAdminUserChats,
  getAdminUserListings,
  getAppealDetail,
  reviewAppeal,
} from '@/features/admin/services/admin-api'
import {
  AdminAppealDetailPayload,
  AdminUserChatsPayload,
  AdminUserListingsPayload,
} from '@/features/admin/types'

export default function AppealReviewPage() {
  const params = useParams()
  const router = useRouter()
  const appealId = params.id as string

  const [appeal, setAppeal] = useState<AdminAppealDetailPayload['appeal'] | null>(null)
  const [userChats, setUserChats] = useState<AdminUserChatsPayload['conversations']>([])
  const [userListings, setUserListings] = useState<AdminUserListingsPayload['listings']>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingAction, setLoadingAction] = useState<'approve' | 'reject' | null>(null)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const appealData = await getAppealDetail(appealId)
        if (cancelled) return

        setAppeal(appealData.appeal)

        const userId = appealData.appeal.userId?._id
        if (!userId) {
          setUserChats([])
          setUserListings([])
          setLoading(false)
          return
        }

        const [chatsData, listingsData] = await Promise.all([
          getAdminUserChats(userId, { messageLimit: 5 }),
          getAdminUserListings(userId, { limit: 20 }),
        ])

        if (cancelled) return
        setUserChats(chatsData.conversations)
        setUserListings(listingsData.listings)
      } catch (loadError) {
        if (cancelled) return
        const message = loadError instanceof Error ? loadError.message : 'Failed to load appeal review'
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
  }, [appealId])

  const handleApprove = async () => {
    setLoadingAction('approve')
    try {
      await reviewAppeal(appealId, 'approve')
      toast.success('Appeal approved successfully')
      router.push('/admin?tab=appeals')
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'Failed to approve appeal')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleReject = async () => {
    const trimmedReason = rejectionReason.trim()
    if (!trimmedReason) {
      toast.error('Rejection reason is required')
      return
    }

    setLoadingAction('reject')
    try {
      await reviewAppeal(appealId, 'reject', trimmedReason)
      toast.success('Appeal rejected successfully')
      router.push('/admin?tab=appeals')
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'Failed to reject appeal')
    } finally {
      setLoadingAction(null)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 px-4 py-20 text-center text-gray-600">Loading appeal review...</div>
  }

  if (!appeal) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-20 text-center">
        <p className="text-gray-700">{error || 'Appeal not found'}</p>
        <button
          onClick={() => router.push('/admin?tab=appeals')}
          className="mt-4 rounded-lg border px-4 py-2 text-sm font-semibold text-gray-700"
        >
          Back to Admin
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-4">
          <button
            onClick={() => router.push('/admin?tab=appeals')}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Admin
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Appeal Review</h1>
            <p className="text-sm text-gray-500">Review a banned user, their chats, and their listings in one place.</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        <section className="rounded-xl border bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{appeal.userId?.name || 'Unknown user'}</h2>
              <p className="text-sm text-gray-500">{appeal.userId?.email || 'No email available'}</p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold capitalize text-gray-700">{appeal.status}</span>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ban Reason</p>
              <p className="mt-2 text-sm text-gray-700">{appeal.reason}</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Appeal Message</p>
              <p className="mt-2 text-sm text-gray-700">{appeal.appealMessage}</p>
            </div>
          </div>

          {appeal.rejectionReason ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Rejection Reason</p>
              <p className="mt-2 text-sm text-red-800">{appeal.rejectionReason}</p>
            </div>
          ) : null}

          {appeal.status === 'pending' ? (
            <div className="mt-6 space-y-3">
              {showRejectForm ? (
                <div className="rounded-lg border bg-gray-50 p-4">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Rejection Reason</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(event) => setRejectionReason(event.target.value)}
                    rows={4}
                    className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
                    placeholder="Explain why this appeal is being rejected"
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleReject}
                      disabled={loadingAction !== null}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {loadingAction === 'reject' ? 'Rejecting...' : 'Confirm Rejection'}
                    </button>
                    <button
                      onClick={() => {
                        setShowRejectForm(false)
                        setRejectionReason('')
                      }}
                      className="rounded-lg border px-4 py-2 text-sm font-semibold text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleApprove}
                    disabled={loadingAction !== null}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {loadingAction === 'approve' ? 'Approving...' : 'Approve Appeal'}
                  </button>
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={loadingAction !== null}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Reject Appeal
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </section>

        <section className="rounded-xl border bg-white p-6">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">User Chats</h2>
            <span className="text-sm text-gray-500">({userChats.length})</span>
          </div>

          {userChats.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">No chats found for this user.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {userChats.map((conversation) => (
                <article key={conversation.conversationId} className="rounded-lg border bg-gray-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{conversation.otherUser?.name || 'Unknown user'}</p>
                      <p className="text-xs text-gray-500">Conversation ID: {conversation.conversationId}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-gray-500">{conversation.messageCount} messages</p>
                      <Link
                        href={`/chat-review/${encodeURIComponent(conversation.conversationId)}?appealId=${encodeURIComponent(appealId)}`}
                        className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                      >
                        View Full Chat
                      </Link>
                    </div>
                  </div>
                  {conversation.product?.title ? (
                    <p className="mt-2 text-sm text-gray-600">About listing: {conversation.product.title}</p>
                  ) : null}
                  {conversation.recentMessages[0]?.content ? (
                    <p className="mt-2 text-sm italic text-gray-600">"{conversation.recentMessages[0].content}"</p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-white p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">User Listings</h2>
              <span className="text-sm text-gray-500">({userListings.length})</span>
            </div>
            {appeal.userId?._id ? (
              <button
                onClick={() => router.push(`/seller-listings/${appeal.userId?._id}`)}
                className="rounded-lg border px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Open Seller Review
              </button>
            ) : null}
          </div>

          {userListings.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">No listings found for this user.</p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {userListings.map((listing) => (
                <article key={listing._id} className="rounded-lg border bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">{listing.title}</p>
                    <span className="rounded-full bg-gray-200 px-2 py-1 text-[11px] font-semibold capitalize text-gray-700">{listing.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{listing.price.toLocaleString()} EGP</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4" />
            <p>These review surfaces intentionally use admin APIs only and do not depend on cached local data or user-facing messaging/listing pages.</p>
          </div>
        </section>
      </div>
    </div>
  )
}
