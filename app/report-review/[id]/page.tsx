'use client'

import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, Flag, Package, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { getReportDetail, reviewReport } from '@/features/admin/services/admin-api'
import { AdminReportDetailPayload } from '@/features/admin/types'
import { listingImageUrl } from '@/lib/utils'

const REPORT_ACTIONS = [
  { key: 'dismiss', label: 'Dismiss', className: 'border border-gray-300 text-gray-700' },
  { key: 'warn-seller', label: 'Warn Seller', className: 'bg-amber-100 text-amber-800' },
  { key: 'delete-listing', label: 'Delete Listing', className: 'bg-red-600 text-white' },
  { key: 'resolve', label: 'Resolve', className: 'bg-green-600 text-white' },
] as const

export default function ReportReviewPage() {
  const params = useParams()
  const router = useRouter()
  const reportId = params.id as string

  const [report, setReport] = useState<AdminReportDetailPayload['report'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  const loadReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getReportDetail(reportId)
      setReport(data.report)
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load report review'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [reportId])

  useEffect(() => {
    void loadReport()
  }, [loadReport])

  const handleAction = async (action: string) => {
    setLoadingAction(action)
    try {
      await reviewReport(reportId, action)
      toast.success('Report updated successfully')
      if (action === 'delete-listing') {
        await loadReport()
      } else {
        router.push('/admin?tab=reports')
      }
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : 'Failed to process report')
    } finally {
      setLoadingAction(null)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 px-4 py-20 text-center text-gray-600">Loading report review...</div>
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-20 text-center">
        <p className="text-gray-700">{error || 'Report not found'}</p>
        <button
          onClick={() => router.push('/admin?tab=reports')}
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
            onClick={() => router.push('/admin?tab=reports')}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Admin
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Report Review</h1>
            <p className="text-sm text-gray-500">Inspect the reported listing and apply a moderation outcome.</p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        <section className="rounded-xl border bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Report Status</h2>
              <p className="text-sm text-gray-500">Created {new Date(report.createdAt).toLocaleString()}</p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold capitalize text-gray-700">{report.status}</span>
          </div>
          <div className="mt-4 rounded-lg bg-red-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Report Reason</p>
            <p className="mt-2 text-sm text-gray-700">{report.reason}</p>
          </div>
          {report.description ? (
            <div className="mt-4 rounded-lg bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Additional Description</p>
              <p className="mt-2 text-sm text-gray-700">{report.description}</p>
            </div>
          ) : null}
        </section>

        <section className="rounded-xl border bg-white p-6">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Reported Listing</h2>
          </div>

          {report.listing ? (
            <div className="mt-4 grid gap-4 md:grid-cols-[220px,1fr]">
              <div className="relative overflow-hidden rounded-xl border bg-gray-50">
                {report.listing.images?.[0] ? (
                  <Image
                    src={listingImageUrl(report.listing.images[0])}
                    alt={report.listing.title || 'Reported listing'}
                    width={220}
                    height={192}
                    className="h-48 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center text-sm text-gray-400">No listing image</div>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{report.listing.title || 'Deleted listing'}</h3>
                  <p className="text-sm text-gray-500 capitalize">Status: {report.listing.status || 'unknown'}</p>
                </div>
                {typeof report.listing.price === 'number' ? (
                  <p className="text-sm text-gray-700">Price: {report.listing.price.toLocaleString()} EGP</p>
                ) : null}
                {report.listing.location ? <p className="text-sm text-gray-700">Location: {report.listing.location}</p> : null}
                {report.listing.seller?._id ? (
                  <button
                    onClick={() => router.push(`/seller-listings/${report.listing?.seller?._id}`)}
                    className="rounded-lg border px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Open Seller Review
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500">The reported listing is no longer available.</p>
          )}
        </section>

        <section className="rounded-xl border bg-white p-6">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Reporter</h2>
          </div>
          <div className="mt-4 rounded-lg bg-gray-50 p-4">
            <p className="text-sm font-semibold text-gray-900">{report.reporter?.name || 'Unknown user'}</p>
            {report.reporter?.email ? <p className="mt-1 text-sm text-gray-500">{report.reporter.email}</p> : null}
          </div>
        </section>

        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <Flag className="mt-0.5 h-4 w-4" />
            <p>Moderation actions are intentionally performed here with full item context instead of from a contextless report row.</p>
          </div>
        </section>

        <section className="rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Moderation Actions</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {REPORT_ACTIONS.map((action) => (
              <button
                key={action.key}
                onClick={() => void handleAction(action.key)}
                disabled={loadingAction !== null}
                className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 ${action.className}`}
              >
                {loadingAction === action.key ? 'Processing...' : action.label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
