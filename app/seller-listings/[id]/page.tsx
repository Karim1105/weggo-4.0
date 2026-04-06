'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ChevronLeft, Trash2, Ban } from 'lucide-react'
import toast from 'react-hot-toast'
import { withCsrfHeader, listingImageUrl } from '@/lib/utils'

export default function SellerListingsPage() {
  const router = useRouter()
  const params = useParams()
  const sellerId = params.id as string

  const [seller, setSeller] = useState<any>(null)
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [selectedListings, setSelectedListings] = useState<Set<string>>(new Set())

  useEffect(() => {
    const storedSeller = typeof window !== 'undefined' ? localStorage.getItem(`seller_${sellerId}`) : null
    if (storedSeller) {
      try {
        const seller = JSON.parse(storedSeller)
        setSeller(seller)
        fetchSellerListings(seller)
      } catch (error) {
        console.error('Failed to parse stored seller:', error)
        router.push('/admin')
      }
    } else {
      console.warn('No seller data found in localStorage')
      router.push('/admin')
    }
    setLoading(false)
  }, [sellerId, router])

  const fetchSellerListings = async (seller: any) => {
    try {
      const res = await fetch(`/api/admin/sellers/${seller._id}/listings`, {
        credentials: 'include',
      })
      const data = await res.json()
      if (data.success) {
        setListings(data.data?.listings || [])
      } else {
        toast.error('Failed to load listings')
      }
    } catch (error) {
      console.error('Failed to fetch listings:', error)
      toast.error('Failed to load listings')
    }
  }

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return

    setLoadingAction(listingId)
    try {
      const res = await fetch(`/api/admin/listings/${listingId}`, {
        method: 'DELETE',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        credentials: 'include',
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Listing deleted successfully')
        setListings((prev) => prev.filter((l) => l._id !== listingId))
      } else {
        toast.error(data.error || 'Failed to delete listing')
      }
    } catch (error) {
      toast.error('Failed to delete listing')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleDeleteSelectedListings = async () => {
    if (selectedListings.size === 0) {
      toast.error('No listings selected')
      return
    }

    if (!confirm(`Delete ${selectedListings.size} selected listing(s)?`)) return

    setLoadingAction('bulk-delete')
    try {
      const listingIds = Array.from(selectedListings)
      const res = await fetch('/api/admin/listings/bulk-delete', {
        method: 'POST',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ listingIds }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(`${selectedListings.size} listing(s) deleted successfully`)
        setListings((prev) => prev.filter((l) => !selectedListings.has(l._id)))
        setSelectedListings(new Set())
      } else {
        toast.error(data.error || 'Failed to delete listings')
      }
    } catch (error) {
      toast.error('Failed to delete listings')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleBanSeller = async () => {
    if (!seller) return

    let reason = ''
    if (!seller.banned) {
      reason = prompt('Provide a reason for banning this seller:') || ''
      if (!reason.trim()) {
        toast.error('Ban reason is required')
        return
      }
    }

    setLoadingAction('ban')
    try {
      const endpoint = seller.banned ? '/api/admin/unban-user' : '/api/admin/ban-user'
      const body: { userId: string; reason?: string } = { userId: seller._id }
      if (!seller.banned && reason) body.reason = reason

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(`Seller ${seller.banned ? 'unbanned' : 'banned'} successfully`)
        setSeller({ ...seller, banned: !seller.banned })
      } else {
        toast.error(data.error || 'Action failed')
      }
    } catch (error) {
      toast.error('Failed to update seller')
    } finally {
      setLoadingAction(null)
    }
  }

  const toggleListingSelection = (listingId: string) => {
    const newSelected = new Set(selectedListings)
    if (newSelected.has(listingId)) {
      newSelected.delete(listingId)
    } else {
      newSelected.add(listingId)
    }
    setSelectedListings(newSelected)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading seller details...</div>
      </div>
    )
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Seller not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin?tab=listings')}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
              >
                <ChevronLeft className="w-5 h-5" />
                Back to Sellers
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{seller.name}'s Listings</h1>
                <p className="text-sm text-gray-600">{seller.email}</p>
              </div>
            </div>
            <button
              onClick={handleBanSeller}
              disabled={loadingAction === 'ban'}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition ${
                seller.banned
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              } disabled:opacity-50`}
            >
              <Ban className="w-4 h-4" />
              {seller.banned ? 'Unban Seller' : 'Ban Seller'}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {listings.length > 0 ? (
          <div className="space-y-4">
            {/* Bulk Action Bar */}
            {selectedListings.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between"
              >
                <p className="text-sm font-medium text-blue-900">
                  {selectedListings.size} listing{selectedListings.size !== 1 ? 's' : ''} selected
                </p>
                <button
                  onClick={handleDeleteSelectedListings}
                  disabled={loadingAction === 'bulk-delete'}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm transition disabled:opacity-50"
                >
                  Delete Selected
                </button>
              </motion.div>
            )}

            {/* Listings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <motion.div
                  key={listing._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-sm overflow-hidden"
                >
                  {/* Thumbnail Image */}
                  {listing.images?.[0] && (
                    <div className="relative w-full h-48 bg-gray-100 overflow-hidden">
                      <img
                        src={listingImageUrl(listing.images[0])}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="p-6">
                    <div className="flex gap-3 mb-4">
                      <input
                        type="checkbox"
                        checked={selectedListings.has(listing._id)}
                        onChange={() => toggleListingSelection(listing._id)}
                        className="w-5 h-5 cursor-pointer mt-1 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-gray-900 truncate">
                          {listing.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">${listing.price}</p>
                        {listing.status && (
                          <p className="text-xs text-gray-500 mt-1 capitalize">
                            Status: {listing.status}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteListing(listing._id)}
                      disabled={loadingAction === listing._id}
                      className="w-full px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">This seller has no listings yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
