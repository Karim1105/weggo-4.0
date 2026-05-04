'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Clock3, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/AsyncStates'
import { TablePagination } from '@/components/admin/TablePagination'
import { getReports, reviewReport } from '@/features/admin/services/admin-api'
import { ActivityLog, AdminNotification, AdminReport, PaginationMeta } from '@/features/admin/types'
import { listingImageUrl } from '@/lib/utils'

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
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => (
            <article key={report._id} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <div className="relative aspect-square overflow-hidden bg-gray-100">
                {report.listing?.images?.[0] ? (
                  <img
                    src={listingImageUrl(report.listing.images[0])}
                    alt={report.listing.title || 'Reported listing'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-400">No listing image</div>
                )}
                <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold capitalize text-gray-700 shadow-sm">
                  {report.listing?.status || 'deleted'}
                </div>
              </div>

              <div className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-base font-semibold text-gray-900">
                      {report.listing?.title || 'Deleted listing'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Reported by {report.reporter?.name || 'Unknown'}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold capitalize text-gray-700">
                    {report.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  {typeof report.listing?.price === 'number' ? (
                    <p className="text-xl font-bold text-primary-600">{report.listing.price.toLocaleString()} EGP</p>
                  ) : (
                    <p className="text-xl font-bold text-gray-400">Listing unavailable</p>
                  )}
                  {report.listing?.location ? (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="line-clamp-1">{report.listing.location}</span>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-gray-400" />
                    <span>{new Date(report.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="rounded-xl bg-red-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-red-700">Report Reason</p>
                  <p className="mt-1 text-sm text-red-900">{report.reason}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/report-review/${report._id}`}
                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700"
                  >
                    Open review
                  </Link>
                </div>

                {report.status === 'pending' && (
                  <div className="flex flex-wrap gap-2">
                    {['dismiss', 'warn-seller', 'delete-listing', 'resolve'].map((action) => (
                      <button
                        key={action}
                        onClick={() => handleAction(report._id, action)}
                        disabled={processingId === report._id}
                        className="rounded-lg border px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-50"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
          </div>

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
