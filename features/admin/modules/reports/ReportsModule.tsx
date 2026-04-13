'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/AsyncStates'
import { TablePagination } from '@/components/admin/TablePagination'
import { getReports, reviewReport } from '@/features/admin/services/admin-api'
import { ActivityLog, AdminNotification, AdminReport, PaginationMeta } from '@/features/admin/types'

interface ReportsModuleProps {
  refreshTick: number
  onActivity: (entry: Omit<ActivityLog, 'id' | 'createdAt'>) => void
  onNotify: (entry: Omit<AdminNotification, 'id' | 'createdAt' | 'read'>) => void
}

const DEFAULT_PAGINATION: PaginationMeta = { page: 1, limit: 10, total: 0, pages: 1 }

export default function ReportsModule({ refreshTick, onActivity, onNotify }: ReportsModuleProps) {
  const [status, setStatus] = useState('pending')
  const [reports, setReports] = useState<AdminReport[]>([])
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const loadReports = async (page = 1, nextStatus = status) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getReports({ page, limit: 10, status: nextStatus, refreshTick })
      setReports(data.reports)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReports(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick])

  const onApplyStatus = (nextStatus: string) => {
    setStatus(nextStatus)
    loadReports(1, nextStatus)
  }

  const handleAction = async (reportId: string, action: string) => {
    setProcessingId(reportId)
    try {
      await reviewReport(reportId, action)
      toast.success('Report updated')
      onNotify({ title: 'Report processed', message: `${action} action applied.` })
      onActivity({ action: 'REVIEW_REPORT', details: `${action} on report ${reportId}`, actor: 'Admin' })
      await loadReports(pagination.page)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to process report')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-4">
        <select value={status} onChange={(e) => onApplyStatus(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
          <option value="all">All reports</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>

      {loading && <LoadingState label="Loading reports..." />}
      {error && <ErrorState message={error} />}
      {!loading && !error && reports.length === 0 && <EmptyState title="No reports found" />}

      {!loading && !error && reports.length > 0 && (
        <div className="space-y-3">
          {reports.map((report) => (
            <article key={report._id} className="rounded-xl border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{report.listing?.title || 'Deleted listing'}</h3>
                  <p className="text-xs text-gray-500">Reported by {report.reporter?.name || 'Unknown'}</p>
                </div>
                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold capitalize text-gray-700">{report.status}</span>
              </div>
              <p className="mt-3 text-sm text-gray-700">{report.reason}</p>
              {report.status === 'pending' && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {['dismiss', 'warn-seller', 'delete-listing', 'resolve'].map((action) => (
                    <button
                      key={action}
                      onClick={() => handleAction(report._id, action)}
                      disabled={processingId === report._id}
                      className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-50"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}

          <div className="rounded-xl border bg-white p-2">
            <TablePagination
              page={pagination.page}
              pages={pagination.pages}
              total={pagination.total}
              onPageChange={(page) => loadReports(page)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
