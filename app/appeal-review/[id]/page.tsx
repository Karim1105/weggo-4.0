'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ChevronLeft, Star } from 'lucide-react'
import toast from 'react-hot-toast'
import { withCsrfHeader } from '@/lib/utils'

export default function AppealReviewPage() {
  const router = useRouter()
  const params = useParams()
  const appealId = params.id as string

  const [appeal, setAppeal] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [userChats, setUserChats] = useState<any[]>([])
  const [userListings, setUserListings] = useState<any[]>([])
  const [detailError, setDetailError] = useState<string | null>(null)
  const [chatsError, setChatsError] = useState<string | null>(null)
  const [listingsError, setListingsError] = useState<string | null>(null)

  useEffect(() => {
    const loadAppeal = async () => {
      setLoading(true)
      setDetailError(null)

      try {
        const res = await fetch(`/api/admin/ban-appeals/${appealId}`, {
          credentials: 'include',
        })
        const data = await res.json()

        if (!res.ok || !data.success || !data.data?.appeal) {
          throw new Error(data.error || 'Failed to load appeal')
        }

        const nextAppeal = data.data.appeal
        setAppeal(nextAppeal)
        if (typeof window !== 'undefined') {
          localStorage.setItem(`appeal_${appealId}`, JSON.stringify(nextAppeal))
        }
        await fetchUserDetails(nextAppeal)
      } catch (error) {
        const storedAppeal = typeof window !== 'undefined' ? localStorage.getItem(`appeal_${appealId}`) : null
        if (storedAppeal) {
          try {
            const fallbackAppeal = JSON.parse(storedAppeal)
            setAppeal(fallbackAppeal)
            setDetailError('Showing cached appeal details because the live admin fetch failed.')
            await fetchUserDetails(fallbackAppeal)
            setLoading(false)
            return
          } catch (fallbackError) {
            console.error('Failed to parse stored appeal:', fallbackError)
          }
        }

        const message = error instanceof Error ? error.message : 'Failed to load appeal details'
        setAppeal(null)
        setDetailError(message)
        toast.error(message)
      }

      setLoading(false)
    }

    void loadAppeal()
  }, [appealId, router])

  const fetchUserDetails = async (appeal: any) => {
    setChatsError(null)
    setListingsError(null)
    setUserChats([])
    setUserListings([])

    try {
      const userId = typeof appeal.userId === 'object' ? appeal.userId._id : appeal.userId

      if (!userId) {
        setChatsError('Appeal is missing the linked user ID.')
        setListingsError('Appeal is missing the linked user ID.')
        return
      }

      const [chatsRes, listingsRes] = await Promise.all([
        fetch(`/api/admin/users/${userId}/chats`, { credentials: 'include' }),
        fetch(`/api/admin/users/${userId}/listings`, { credentials: 'include' }),
      ])

      const chatsData = await chatsRes.json()
      const listingsData = await listingsRes.json()

      if (chatsRes.ok && chatsData.success) {
        setUserChats(chatsData.data?.conversations || [])
      } else {
        setChatsError(chatsData.error || 'Failed to load user chats')
      }

      if (listingsRes.ok && listingsData.success) {
        setUserListings(listingsData.data?.listings || [])
      } else {
        setListingsError(listingsData.error || 'Failed to load user listings')
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error)
      setChatsError('Failed to load user chats')
      setListingsError('Failed to load user listings')
      toast.error('Failed to load user details')
    }
  }

  const handleAppealAction = async (action: 'approve' | 'reject') => {
    let rejectionReason = ''

    if (action === 'reject') {
      rejectionReason = prompt('Provide a reason for rejecting this appeal:') || ''
      if (!rejectionReason.trim()) {
        toast.error('Rejection reason is required')
        return
      }
    }

    setLoadingAction(action)
    try {
      const res = await fetch(`/api/admin/ban-appeals/${appealId}`, {
        method: 'POST',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ action, rejectionReason }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(`Appeal ${action}ed successfully`)
        router.push('/admin?tab=appeals')
      } else {
        toast.error(data.error || 'Action failed')
      }
    } catch (error) {
      toast.error('Failed to process appeal')
    } finally {
      setLoadingAction(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading appeal details...</div>
      </div>
    )
  }

  if (!appeal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-gray-600">{detailError || 'Appeal not found'}</div>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Back to Admin
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              <ChevronLeft className="w-5 h-5" />
              Back to Admin
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Appeal Review</h1>
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
              appeal.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              appeal.status === 'approved' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }`}>
              {appeal.status?.charAt(0).toUpperCase() + appeal.status?.slice(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {detailError && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-yellow-50 border border-yellow-200 text-yellow-900 p-4 rounded-xl shadow-sm"
            >
              {detailError}
            </motion.div>
          )}

          {/* User Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-xl shadow-sm"
          >
            <h2 className="text-lg font-semibold mb-4">User Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Name</p>
                <p className="text-gray-900">{appeal.userId?.name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Email</p>
                <p className="text-gray-900">{appeal.userId?.email || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Appeal Submitted</p>
                <p className="text-gray-900">{new Date(appeal.createdAt).toLocaleString()}</p>
              </div>
            </div>
          </motion.div>

          {/* Ban Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-50 p-6 rounded-xl shadow-sm"
          >
            <h2 className="text-lg font-semibold mb-4">Ban Information</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2 font-semibold">Ban Reason:</p>
                <p className="text-gray-700">{appeal.reason}</p>
              </div>
            </div>
          </motion.div>

          {/* Appeal Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-blue-50 p-6 rounded-xl shadow-sm"
          >
            <h2 className="text-lg font-semibold mb-4">Appeal Message</h2>
            <p className="text-gray-700">{appeal.appealMessage}</p>
          </motion.div>

          {/* Rejection Reason (if rejected) */}
          {appeal.status === 'rejected' && appeal.rejectionReason && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-red-50 p-6 rounded-xl shadow-sm"
            >
              <h2 className="text-lg font-semibold mb-4 text-red-900">Rejection Reason</h2>
              <p className="text-red-800">{appeal.rejectionReason}</p>
            </motion.div>
          )}

          {/* User Chats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-6 rounded-xl shadow-sm"
          >
            <h2 className="text-lg font-semibold mb-4">User Chats ({userChats.length})</h2>
            {chatsError ? (
              <p className="text-sm text-red-600">{chatsError}</p>
            ) : userChats && userChats.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {userChats.map((conversation: any) => (
                  <a
                    key={conversation.conversationId}
                    href={`/messages/${conversation.conversationId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-gray-50 p-4 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium text-gray-900">{conversation.otherUser?.name}</p>
                      <p className="text-xs text-gray-500">Messages: {conversation.messageCount || 0}</p>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{conversation.product?.title}</p>
                    {conversation.recentMessages && conversation.recentMessages.length > 0 && (
                      <p className="text-sm text-gray-600 italic mb-2">{conversation.recentMessages[0].content?.substring(0, 100)}...</p>
                    )}
                    <p className="text-blue-600 text-xs font-semibold">Open in new tab →</p>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No chats found</p>
            )}
          </motion.div>

          {/* User Listings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white p-6 rounded-xl shadow-sm"
          >
            <h2 className="text-lg font-semibold mb-4">User Listings ({userListings.length})</h2>
            {listingsError ? (
              <p className="text-sm text-red-600">{listingsError}</p>
            ) : userListings && userListings.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {userListings.map((listing: any) => (
                  <a
                    key={listing._id}
                    href={`/listings/${listing._id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-gray-50 p-4 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-gray-900">{listing.title}</p>
                      <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-800 rounded">
                        {listing.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">${listing.price}</p>
                    {listing.averageRating > 0 && (
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm text-gray-600">
                          {listing.averageRating} ({listing.ratingCount} reviews)
                        </span>
                      </div>
                    )}
                    <p className="text-blue-600 text-xs font-semibold">Open in new tab →</p>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No listings found</p>
            )}
          </motion.div>

          {/* Action Buttons */}
          {appeal.status === 'pending' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white p-6 rounded-xl shadow-sm flex gap-3"
            >
              <button
                onClick={() => handleAppealAction('approve')}
                disabled={loadingAction !== null}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 transition"
              >
                {loadingAction === 'approve' ? 'Approving...' : 'Approve Appeal'}
              </button>
              <button
                onClick={() => handleAppealAction('reject')}
                disabled={loadingAction !== null}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 transition"
              >
                {loadingAction === 'reject' ? 'Rejecting...' : 'Reject Appeal'}
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
