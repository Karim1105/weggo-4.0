'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  MapPin,
  Clock,
  Heart,
  MessageCircle,
  Share2,
  Flag,
  User,
  Star,
} from 'lucide-react'
import toast from 'react-hot-toast'
import ProductCard from '@/components/ProductCard'
import { mapApiListingToProduct, withCsrfHeader } from '@/lib/utils'

interface Seller {
  _id: string
  name: string
  email?: string
  avatar?: string
  isVerified?: boolean
  phone?: string
  location?: string
}

interface Listing {
  _id: string
  title: string
  description: string
  price: number
  location: string
  condition: string
  category: string
  images: string[]
  views: number
  createdAt: string
  seller: Seller
}

export default function ListingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [listing, setListing] = useState<Listing | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [messageText, setMessageText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [isFavorite, setIsFavorite] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ _id: string; role?: string } | null>(null)
  const [similar, setSimilar] = useState<any[]>([])

  useEffect(() => {
    fetchListing()
  }, [id])

  useEffect(() => {
    if (!listing) return
    const loadSimilar = async () => {
      try {
        const res = await fetch(`/api/listings?category=${encodeURIComponent(listing.category)}&limit=8`, { credentials: 'include' })
        const data = await res.json()
        const listings = data.data?.listings ?? data.listings
        if (data.success && Array.isArray(listings)) {
          setSimilar(listings.filter((p: any) => p._id !== listing._id).slice(0, 4))
        }
      } catch {
        setSimilar([])
      }
    }
    loadSimilar()
  }, [listing])

  useEffect(() => {
    if (!listing) return
    fetch('/api/wishlist', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.wishlist)) {
          const inWishlist = d.wishlist.some((p: { _id: string }) => p._id === id)
          setIsFavorite(inWishlist)
        }
      })
      .catch(() => {})
  }, [listing, id])

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        const data = await res.json()
        if (data.success && data.user) {
          setCurrentUser({ _id: data.user.id || data.user._id, role: data.user.role })
        }
      } catch {
        setCurrentUser(null)
      }
    }
    loadUser()
  }, [])

  const fetchListing = async () => {
    try {
      const res = await fetch(`/api/listings/${id}`, { credentials: 'include' })
      const data = await res.json()
      if (res.status === 401) {
        router.push(`/login?redirect=/listings/${id}`)
        return
      }
      if (!data.success) {
        setError(data.error || 'Failed to load listing')
        return
      }
      setListing(data.product)
    } catch (err) {
      setError('Failed to load listing')
    } finally {
      setLoading(false)
    }
  }

  const handleContactSeller = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim() || !listing) return
    setSendingMessage(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          receiverId: listing.seller._id,
          productId: listing._id,
          content: messageText.trim(),
        }),
      })
      const data = await res.json()
      if (res.status === 401) {
        toast.error('Please log in to contact the seller')
        router.push(`/login?redirect=/listings/${id}`)
        return
      }
      if (data.success) {
        toast.success('Message sent!')
        setMessageText('')
        if (data.message?.conversationId) {
          router.push(`/messages/${encodeURIComponent(data.message.conversationId)}`)
        }
      } else {
        toast.error(data.error || 'Failed to send message')
      }
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSendingMessage(false)
    }
  }

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reportReason.trim()) return
    try {
      const res = await fetch(`/api/listings/${id}/report`, {
        method: 'POST',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ reason: reportReason.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Report submitted. Thank you.')
        setShowReportModal(false)
        setReportReason('')
      } else {
        toast.error(data.error || 'Failed to submit report')
      }
    } catch {
      toast.error('Failed to submit report')
    }
  }

  const toggleFavorite = async () => {
    try {
      if (isFavorite) {
        await fetch('/api/wishlist', {
          method: 'DELETE',
          headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
          credentials: 'include',
          body: JSON.stringify({ productId: id }),
        })
      } else {
        await fetch('/api/wishlist', {
          method: 'POST',
          headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
          credentials: 'include',
          body: JSON.stringify({ productId: id }),
        })
      }
      setIsFavorite(!isFavorite)
    } catch {
      toast.error('Please log in to save favorites')
    }
  }

  const canManageListing =
    currentUser && listing && (currentUser._id === listing.seller._id || currentUser.role === 'admin')

  const handleDelete = async () => {
    if (!listing || !canManageListing) return
    if (!window.confirm('Are you sure you want to delete this listing?')) return
    try {
      const res = await fetch(`/api/listings/${listing._id}`, {
        method: 'DELETE',
        headers: withCsrfHeader({}),
        credentials: 'include',
      })
      const data = await res.json()
      if (!data.success) {
        toast.error(data.error || 'Failed to delete listing')
        return
      }
      toast.success('Listing deleted')
      router.push('/profile')
      router.refresh()
    } catch {
      toast.error('Failed to delete listing')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center">
        <div className="animate-pulse w-full max-w-4xl">
          <div className="h-96 bg-gray-200 rounded-xl mb-6" />
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4" />
          <div className="h-6 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    )
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center justify-center">
        <p className="text-red-600 mb-4">{error || 'Listing not found'}</p>
        <Link
          href="/browse"
          className="text-primary-600 hover:underline flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to browse
        </Link>
      </div>
    )
  }

  const imageUrl = listing.images?.[selectedImage] || listing.images?.[0] || ''
  const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : `${process.env.NEXT_PUBLIC_APP_URL || ''}${imageUrl}`

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <Link
          href="/browse"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to browse
        </Link>

        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl border border-white/20 overflow-hidden mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 lg:p-8">
            {/* Images */}
            <div>
              <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 mb-4">
                <img
                  src={fullImageUrl}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              </div>
              {listing.images && listing.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {listing.images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedImage(i)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                        selectedImage === i ? 'border-primary-500' : 'border-gray-200'
                      }`}
                    >
                      <img
                        src={img.startsWith('http') ? img : `${process.env.NEXT_PUBLIC_APP_URL || ''}${img}`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                    {listing.title}
                  </h1>
                  <p className="text-3xl font-bold text-primary-600">
                    {listing.price.toLocaleString()} EGP
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleFavorite}
                    className="p-2 rounded-full bg-gray-100 hover:bg-red-50 transition-colors"
                    title="Save to favorites"
                  >
                    <Heart
                      className={`w-5 h-5 ${
                        isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(true)}
                    className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                    title="Report listing"
                  >
                    <Flag className="w-5 h-5 text-gray-600" />
                  </button>
                  {canManageListing && (
                    <>
                      <Link
                        href={`/listings/${listing._id}/edit`}
                        className="px-3 py-1.5 rounded-full border border-gray-300 text-sm font-medium hover:bg-gray-100"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="px-3 py-1.5 rounded-full border border-red-300 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mb-6">
                <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                  {listing.condition}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                  {listing.category}
                </span>
                <div className="flex items-center gap-1 text-gray-500 text-sm">
                  <MapPin className="w-4 h-4" />
                  {listing.location}
                </div>
                <div className="flex items-center gap-1 text-gray-500 text-sm">
                  <Clock className="w-4 h-4" />
                  {listing.views} views
                </div>
              </div>

              <p className="text-gray-700 whitespace-pre-wrap mb-6">{listing.description}</p>

              {/* Seller card */}
              <div className="p-4 bg-gray-50 rounded-xl mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{listing.seller?.name}</p>
                    {listing.seller?.isVerified && (
                      <span className="text-xs text-green-600 font-medium">Verified seller</span>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                Weggo does not handle payments. Arrange payment and delivery directly with the seller.
              </p>

              {/* Contact seller */}
              <form onSubmit={handleContactSeller} className="space-y-3">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Message the seller..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
                <motion.button
                  type="submit"
                  disabled={sendingMessage}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  <MessageCircle className="w-5 h-5" />
                  {sendingMessage ? 'Sending...' : 'Contact seller'}
                </motion.button>
              </form>
            </div>
          </div>
        </div>

        {similar.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Similar items</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {similar.map((p: any, index: number) => {
                const card = mapApiListingToProduct(p, new Set())
                return (
                  <ProductCard
                    key={card.id}
                    product={card as any}
                    index={index}
                    onToggleFavorite={() => {}}
                  />
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Report modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
          >
            <h3 className="text-lg font-semibold mb-4">Report this listing</h3>
            <form onSubmit={handleReport} className="space-y-4">
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Why are you reporting this listing?"
                rows={4}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500"
                required
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                >
                  Submit report
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
