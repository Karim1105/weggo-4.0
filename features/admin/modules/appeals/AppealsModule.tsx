'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/AsyncStates'
import { TablePagination } from '@/components/admin/TablePagination'
import { getAppeals, reviewAppeal } from '@/features/admin/services/admin-api'
import { ActivityLog, AdminAppeal, AdminNotification, PaginationMeta } from '@/features/admin/types'

interface AppealsModuleProps {
  refreshTick: number
  onActivity: (entry: Omit<ActivityLog, 'id' | 'createdAt'>) => void
  onNotify: (entry: Omit<AdminNotification, 'id' | 'createdAt' | 'read'>) => void
}

const DEFAULT_PAGINATION: PaginationMeta = { page: 1, limit: 10, total: 0, pages: 1 }

export default function AppealsModule({ refreshTick, onActivity, onNotify }: AppealsModuleProps) {
  const [status, setStatus] = useState('pending')
  const [appeals, setAppeals] = useState<AdminAppeal[]>([])
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAppeals = async (page = 1, nextStatus = status) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAppeals({ page, limit: 10, status: nextStatus, refreshTick })
      setAppeals(data.appeals)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load appeals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAppeals(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick])

  const handleStatusChange = (nextStatus: string) => {
    setStatus(nextStatus)
    loadAppeals(1, nextStatus)
  }

  const handleReview = async (appealId: string, action: 'approve' | 'reject') => {
    try {
      const rejectionReason = action === 'reject' ? window.prompt('Rejection reason') ?? '' : ''
      if (action === 'reject' && !rejectionReason.trim()) {
        toast.error('Rejection reason is required')
        return
      }
      await reviewAppeal(appealId, action, action === 'reject' ? rejectionReason : undefined)
      toast.success(`Appeal ${action}d successfully`)
      onNotify({ title: 'Appeal reviewed', message: `${action} applied to appeal ${appealId}.` })
      onActivity({ action: 'REVIEW_APPEAL', details: `${action} on appeal ${appealId}`, actor: 'Admin' })
      await loadAppeals(pagination.page)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to review appeal')
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-4">
        <select value={status} onChange={(e) => handleStatusChange(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
          <option value="pending">Pending</option>
          <option value="all">All appeals</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading && <LoadingState label="Loading appeals..." />}
      {error && <ErrorState message={error} />}
      {!loading && !error && appeals.length === 0 && <EmptyState title="No appeals found" />}

      {!loading && !error && appeals.length > 0 && (
        <div className="space-y-3">
          {appeals.map((appeal) => (
            <article key={appeal._id} className="rounded-xl border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{appeal.userId?.name || 'Unknown user'}</h3>
                  <p className="text-xs text-gray-500">{appeal.userId?.email || 'No email'}</p>
                </div>
                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold capitalize text-gray-700">{appeal.status}</span>
              </div>
              <p className="mt-3 text-sm text-gray-700">{appeal.appealMessage}</p>
              {appeal.status === 'pending' && (
                <div className="mt-4 flex gap-2">
                  <button onClick={() => handleReview(appeal._id, 'approve')} className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                    Approve
                  </button>
                  <button onClick={() => handleReview(appeal._id, 'reject')} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700">
                    Reject
                  </button>
                </div>
              )}
            </article>
          ))}

          <div className="rounded-xl border bg-white p-2">
            <TablePagination
              page={pagination.page}
              pages={pagination.pages}
              total={pagination.total}
              onPageChange={(page) => loadAppeals(page)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
