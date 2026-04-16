'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/AsyncStates'
import { TablePagination } from '@/components/admin/TablePagination'
import { banUser, boostListing, getSellerListings, getSellers, unbanUser } from '@/features/admin/services/admin-api'
import { ActivityLog, AdminNotification, AdminSeller, PaginationMeta, SellerListing } from '@/features/admin/types'
import { listingImageUrl } from '@/lib/utils'

interface ListingsModuleProps {
  refreshTick: number
  onActivity: (entry: Omit<ActivityLog, 'id' | 'createdAt'>) => void
  onNotify: (entry: Omit<AdminNotification, 'id' | 'createdAt' | 'read'>) => void
}

const DEFAULT_PAGINATION: PaginationMeta = { page: 1, limit: 12, total: 0, pages: 1 }

export default function ListingsModule({ refreshTick, onActivity, onNotify }: ListingsModuleProps) {
  const router = useRouter()
  const [sellers, setSellers] = useState<AdminSeller[]>([])
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null)
  const [sellerListings, setSellerListings] = useState<SellerListing[]>([])
  const [loadingListings, setLoadingListings] = useState(false)

  const loadSellers = async (page = 1) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getSellers({ page, limit: 12, refreshTick })
      setSellers(data.sellers)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sellers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSellers(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick])

  const loadSellerListings = async (sellerId: string) => {
    setLoadingListings(true)
    try {
      const data = await getSellerListings(sellerId)
      setSellerListings(data.listings)
      setSelectedSellerId(sellerId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load listings')
    } finally {
      setLoadingListings(false)
    }
  }

  const handleBanToggle = async (seller: AdminSeller) => {
    try {
      if (seller.banned) {
        await unbanUser(seller._id)
        onNotify({ title: 'Seller unbanned', message: `${seller.name} was unbanned.` })
        onActivity({ action: 'UNBAN_SELLER', details: `Unbanned seller ${seller._id}`, actor: 'Admin' })
      } else {
        const reason = window.prompt('Reason for banning seller') || ''
        if (!reason.trim()) return
        await banUser(seller._id, reason)
        onNotify({ title: 'Seller banned', message: `${seller.name} was banned.` })
        onActivity({ action: 'BAN_SELLER', details: `Banned seller ${seller._id}`, actor: 'Admin' })
      }

      toast.success('Seller updated')
      await loadSellers(pagination.page)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update seller')
    }
  }

  const handleBoostToggle = async (listing: SellerListing) => {
    try {
      await boostListing(listing._id, listing.isBoosted ? 'unboost' : 'boost')
      onNotify({
        title: listing.isBoosted ? 'Listing unboosted' : 'Listing boosted',
        message: `${listing.title} visibility was updated.`,
      })
      onActivity({
        action: listing.isBoosted ? 'UNBOOST_LISTING' : 'BOOST_LISTING',
        details: `Updated listing ${listing._id}`,
        actor: 'Admin',
      })
      if (selectedSellerId) {
        const data = await getSellerListings(selectedSellerId)
        setSellerListings(data.listings)
      }
      toast.success('Listing updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update listing')
    }
  }

  return (
    <div className="space-y-4">
      {loading && <LoadingState label="Loading listings management..." />}
      {error && <ErrorState message={error} />}
      {!loading && !error && sellers.length === 0 && <EmptyState title="No sellers found" />}

      {!loading && !error && sellers.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sellers.map((seller) => (
              <article key={seller._id} className="rounded-xl border bg-white p-4">
                <h3 className="text-sm font-semibold text-gray-900">{seller.name}</h3>
                <p className="text-xs text-gray-500">{seller.email}</p>
                <p className="mt-2 text-xs text-gray-500">Listings: {seller.listingCount}</p>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => loadSellerListings(seller._id)}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                  >
                    Manage listings
                  </button>
                  <button
                    onClick={() => handleBanToggle(seller)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                      seller.banned ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'
                    }`}
                  >
                    {seller.banned ? 'Unban' : 'Ban'}
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="rounded-xl border bg-white p-2">
            <TablePagination
              page={pagination.page}
              pages={pagination.pages}
              total={pagination.total}
              onPageChange={(page) => loadSellers(page)}
            />
          </div>
        </>
      )}

      {selectedSellerId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 px-4 py-10">
          <div className="mx-auto w-full max-w-4xl rounded-xl border bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Listing previews</h3>
              <button onClick={() => setSelectedSellerId(null)} className="rounded-lg border px-2 py-1 text-xs">
                Close
              </button>
            </div>

            {loadingListings && <LoadingState label="Loading seller listings..." />}

            {!loadingListings && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {sellerListings.map((listing) => (
                  <article key={listing._id} className="overflow-hidden rounded-xl border">
                    <img src={listingImageUrl(listing.images?.[0])} alt={listing.title} className="h-36 w-full object-cover" />
                    <div className="space-y-2 p-3">
                      <p className="line-clamp-2 text-sm font-semibold text-gray-900">{listing.title}</p>
                      <p className="text-xs text-gray-500">{listing.status} • {listing.price.toLocaleString()} EGP</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleBoostToggle(listing)}
                          className={`rounded-md px-2 py-1 text-xs font-semibold ${
                            listing.isBoosted ? 'bg-yellow-100 text-yellow-800' : 'bg-indigo-100 text-indigo-700'
                          }`}
                        >
                          {listing.isBoosted ? 'Unboost' : 'Boost'}
                        </button>
                        <button
                          onClick={() => router.push(`/listings/${listing._id}`)}
                          className="rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700"
                        >
                          Open
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
