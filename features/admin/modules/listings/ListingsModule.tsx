'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/AsyncStates'
import { TablePagination } from '@/components/admin/TablePagination'
import { banUser, getSellers, unbanUser } from '@/features/admin/services/admin-api'
import { ActivityLog, AdminNotification, AdminSeller, PaginationMeta } from '@/features/admin/types'

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
                    onClick={() => router.push(`/seller-listings/${seller._id}`)}
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
    </div>
  )
}
