'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Ban, ChevronLeft, Sparkles, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { adminDeleteListing } from '@/features/admin-actions/listings'
import { banUser, boostListing, getSellerListings, unbanUser } from '@/features/admin/services/admin-api'
import { SellerListingsPayload } from '@/features/admin/types'
import { listingImageUrl } from '@/lib/utils'

export default function SellerListingsPage() {
  const params = useParams()
  const router = useRouter()
  const sellerId = params.id as string

  const [sellerData, setSellerData] = useState<SellerListingsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedListings, setSelectedListings] = useState<Set<string>>(new Set())
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [showBanForm, setShowBanForm] = useState(false)
  const [banReason, setBanReason] = useState('')

  const seller = sellerData?.seller || null
  const listings = sellerData?.listings || []

  const selectedCount = useMemo(() => selectedListings.size, [selectedListings])

  const loadSellerData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getSellerListings(sellerId, { limit: 100, status: 'all' })
      setSellerData(data)
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load seller review'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [sellerId])

  useEffect(() => {
    void loadSellerData()
  }, [loadSellerData])

  const toggleListingSelection = (listingId: string) => {
    setSelectedListings((prev) => {
      const next = new Set(prev)
      if (next.has(listingId)) {
        next.delete(listingId)
      } else {
        next.add(listingId)
      }
      return next
    })
  }

  const handleDeleteListing = async (listingId: string) => {
    if (!window.confirm('Delete this listing? This action hides it from the marketplace.')) {
      return
    }

    setLoadingAction(listingId)
    try {
      await adminDeleteListing(listingId)
      toast.success('Listing deleted successfully')
      setSellerData((prev) =>
        prev
          ? {
              ...prev,
              listings: prev.listings.filter((listing) => listing._id !== listingId),
            }
          : prev
      )
      setSelectedListings((prev) => {
        const next = new Set(prev)
        next.delete(listingId)
        return next
      })
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : 'Failed to delete listing')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedCount === 0) {
      toast.error('No listings selected')
      return
    }

    if (!window.confirm(`Delete ${selectedCount} selected listing(s)?`)) {
      return
    }

    setLoadingAction('bulk-delete')
    try {
      for (const listingId of selectedListings) {
        await adminDeleteListing(listingId)
      }
      toast.success(`${selectedCount} listing(s) deleted successfully`)
      setSellerData((prev) =>
        prev
          ? {
              ...prev,
              listings: prev.listings.filter((listing) => !selectedListings.has(listing._id)),
            }
          : prev
      )
      setSelectedListings(new Set())
    } catch (bulkError) {
      toast.error(bulkError instanceof Error ? bulkError.message : 'Failed to delete selected listings')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleBoostToggle = async (listingId: string, isBoosted: boolean) => {
    setLoadingAction(listingId)
    try {
      await boostListing(listingId, isBoosted ? 'unboost' : 'boost')
      toast.success(isBoosted ? 'Listing unboosted' : 'Listing boosted')
      setSellerData((prev) =>
        prev
          ? {
              ...prev,
              listings: prev.listings.map((listing) =>
                listing._id === listingId ? { ...listing, isBoosted: !isBoosted } : listing
              ),
            }
          : prev
      )
    } catch (boostError) {
      toast.error(boostError instanceof Error ? boostError.message : 'Failed to update listing boost')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleSellerBanToggle = async () => {
    if (!seller) return

    if (seller.banned) {
      setLoadingAction('seller-ban')
      try {
        await unbanUser(seller._id)
        toast.success('Seller unbanned successfully')
        await loadSellerData()
      } catch (unbanError) {
        toast.error(unbanError instanceof Error ? unbanError.message : 'Failed to unban seller')
      } finally {
        setLoadingAction(null)
      }
      return
    }

    const trimmedReason = banReason.trim()
    if (!trimmedReason) {
      toast.error('Ban reason is required')
      return
    }

    setLoadingAction('seller-ban')
    try {
      await banUser(seller._id, trimmedReason)
      toast.success('Seller banned successfully')
      setShowBanForm(false)
      setBanReason('')
      await loadSellerData()
    } catch (banError) {
      toast.error(banError instanceof Error ? banError.message : 'Failed to ban seller')
    } finally {
      setLoadingAction(null)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 px-4 py-20 text-center text-gray-600">Loading seller review...</div>
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-20 text-center">
        <p className="text-gray-700">{error || 'Seller not found'}</p>
        <button
          onClick={() => router.push('/admin?tab=listings')}
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
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin?tab=listings')}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to Admin
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{seller.name}'s Listings</h1>
                <p className="text-sm text-gray-500">{seller.email}</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (seller.banned) {
                  void handleSellerBanToggle()
                } else {
                  setShowBanForm(true)
                }
              }}
              disabled={loadingAction === 'seller-ban'}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
                seller.banned ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              <Ban className="h-4 w-4" />
              {seller.banned ? 'Unban Seller' : 'Ban Seller'}
            </button>
          </div>

          {showBanForm ? (
            <div className="mt-4 rounded-xl border bg-gray-50 p-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">Ban Reason</label>
              <textarea
                value={banReason}
                onChange={(event) => setBanReason(event.target.value)}
                rows={3}
                className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="Reason for banning this seller"
              />
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => void handleSellerBanToggle()}
                  disabled={loadingAction === 'seller-ban' || !banReason.trim()}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Confirm Ban
                </button>
                <button
                  onClick={() => {
                    setShowBanForm(false)
                    setBanReason('')
                  }}
                  className="rounded-lg border px-4 py-2 text-sm font-semibold text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-4 px-4 py-8">
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        {selectedCount > 0 ? (
          <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-900">{selectedCount} listing(s) selected</p>
            <button
              onClick={() => void handleBulkDelete()}
              disabled={loadingAction === 'bulk-delete'}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Delete Selected
            </button>
          </div>
        ) : null}

        {listings.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center text-gray-500">This seller has no listings yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <article key={listing._id} className="overflow-hidden rounded-xl border bg-white shadow-sm">
                {listing.images?.[0] ? (
                  <Image
                    src={listingImageUrl(listing.images[0])}
                    alt={listing.title}
                    width={420}
                    height={192}
                    className="h-48 w-full object-cover"
                  />
                ) : null}
                <div className="p-5">
                  <div className="flex gap-3">
                    <input
                      type="checkbox"
                      checked={selectedListings.has(listing._id)}
                      onChange={() => toggleListingSelection(listing._id)}
                      className="mt-1 h-4 w-4"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900">{listing.title}</p>
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold capitalize text-gray-700">{listing.status}</span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">{listing.price.toLocaleString()} EGP</p>
                      {listing.isBoosted ? (
                        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-[11px] font-semibold text-yellow-800">
                          <Sparkles className="h-3.5 w-3.5" />
                          Boosted
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => void handleBoostToggle(listing._id, Boolean(listing.isBoosted))}
                      disabled={loadingAction === listing._id}
                      className="rounded-lg bg-indigo-100 px-3 py-2 text-xs font-semibold text-indigo-700 disabled:opacity-50"
                    >
                      {listing.isBoosted ? 'Unboost' : 'Boost'}
                    </button>
                    <button
                      onClick={() => void handleDeleteListing(listing._id)}
                      disabled={loadingAction === listing._id}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                    {listing.status === 'active' ? (
                      <Link
                        href={`/listings/${listing._id}`}
                        className="rounded-lg border px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Open Listing
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
