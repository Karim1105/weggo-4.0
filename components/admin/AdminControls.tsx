'use client'

import Link from 'next/link'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Pencil, Sparkles } from 'lucide-react'
import AdminActionButton from '@/components/admin/AdminActionButton'
import { adminDeleteListing, adminSetFeatured, adminSetVisibility } from '@/features/admin-actions/listings'

interface AdminControlsProps {
  listingId: string
  editHref: string
  status: 'active' | 'sold' | 'pending' | 'deleted'
  isVisible: boolean
  isFeatured: boolean
  onVisibilityChange: (visible: boolean) => void
  onFeaturedChange: (featured: boolean) => void
  onDeleted: () => void
}

export default function AdminControls({
  listingId,
  editHref,
  status,
  isVisible,
  isFeatured,
  onVisibilityChange,
  onFeaturedChange,
  onDeleted,
}: AdminControlsProps) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const canToggleVisibility = status === 'active' || status === 'deleted'

  const handleToggleVisibility = async () => {
    if (!canToggleVisibility) {
      toast.error('Visibility can only be changed for active or hidden listings')
      return
    }

    const nextVisible = !isVisible
    setLoadingKey('visibility')
    try {
      await adminSetVisibility(listingId, nextVisible)
      onVisibilityChange(nextVisible)
      toast.success(nextVisible ? 'Listing is visible' : 'Listing hidden from users')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update visibility')
    } finally {
      setLoadingKey(null)
    }
  }

  const handleToggleFeatured = async () => {
    const nextFeatured = !isFeatured
    setLoadingKey('featured')
    try {
      await adminSetFeatured(listingId, nextFeatured)
      onFeaturedChange(nextFeatured)
      toast.success(nextFeatured ? 'Listing featured' : 'Listing unfeatured')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update listing feature')
    } finally {
      setLoadingKey(null)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this listing? This action hides it from the marketplace.')) {
      return
    }

    setLoadingKey('delete')
    try {
      await adminDeleteListing(listingId)
      toast.success('Listing deleted successfully')
      onDeleted()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete listing')
    } finally {
      setLoadingKey(null)
    }
  }

  return (
    <div className="w-full max-w-sm rounded-xl border border-indigo-200 bg-white/95 p-3 shadow-lg backdrop-blur">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">Admin controls</p>
      <div className="grid grid-cols-2 gap-2">
        <Link
          href={editHref}
          className="inline-flex items-center justify-center gap-1 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Link>

        <AdminActionButton
          label={isVisible ? 'Hide' : 'Unhide'}
          disabled={!canToggleVisibility}
          loading={loadingKey === 'visibility'}
          onClick={handleToggleVisibility}
          variant="warning"
        />

        <AdminActionButton
          label={isFeatured ? 'Unfeature' : 'Feature'}
          loading={loadingKey === 'featured'}
          onClick={handleToggleFeatured}
        />

        <AdminActionButton
          label="Delete"
          loading={loadingKey === 'delete'}
          onClick={handleDelete}
          variant="danger"
        />
      </div>

      <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-500">
        <span className="inline-flex items-center gap-1">
          {isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />} Visible: {isVisible ? 'Yes' : 'No'}
        </span>
        <span className="inline-flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5" /> Featured: {isFeatured ? 'Yes' : 'No'}
        </span>
      </div>
      {!canToggleVisibility ? (
        <p className="mt-2 text-[11px] text-amber-700">
          Visibility toggle only applies to active or hidden listings.
        </p>
      ) : null}
    </div>
  )
}
