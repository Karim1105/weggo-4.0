'use client'

import { EyeOff, MoreVertical, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { adminDeleteListing, adminSetFeatured, adminSetVisibility } from '@/features/admin-actions/listings'
import { Product } from '@/app/browse/types'

interface ListingAdminMenuProps {
  product: Product
  onUpdate?: (id: string, updates: Partial<Product>) => void
  onRemove?: (id: string) => void
  buttonClassName?: string
  iconClassName?: string
  menuClassName?: string
}

export default function ListingAdminMenu({
  product,
  onUpdate,
  onRemove,
  buttonClassName = 'w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors',
  iconClassName = 'w-5 h-5 text-gray-600',
  menuClassName = 'absolute top-12 right-4 bg-white rounded-lg shadow-xl z-50 overflow-hidden',
}: ListingAdminMenuProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  const handleDeleteListing = async (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    if (!window.confirm('Delete this listing? This action hides it from the marketplace.')) {
      return
    }

    setLoadingKey('delete')
    try {
      await adminDeleteListing(product.id)
      toast.success('Listing deleted successfully')
      setShowDropdown(false)
      onRemove?.(product.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete listing')
    } finally {
      setLoadingKey(null)
    }
  }

  const handleHideListing = async (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setLoadingKey('hide')

    try {
      await adminSetVisibility(product.id, false)
      toast.success('Listing hidden from users')
      setShowDropdown(false)
      onRemove?.(product.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update visibility')
    } finally {
      setLoadingKey(null)
    }
  }

  const handleToggleFeatured = async (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const nextFeatured = !product.isBoosted
    setLoadingKey('featured')

    try {
      await adminSetFeatured(product.id, nextFeatured)
      toast.success(nextFeatured ? 'Listing featured' : 'Listing unfeatured')
      setShowDropdown(false)
      onUpdate?.(product.id, { isBoosted: nextFeatured })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update listing feature')
    } finally {
      setLoadingKey(null)
    }
  }

  return (
    <>
      {showDropdown ? (
        <div className={menuClassName} ref={dropdownRef}>
          <button
            onClick={handleToggleFeatured}
            disabled={loadingKey !== null}
            className="w-full flex items-center space-x-2 px-4 py-2 hover:bg-indigo-50 text-indigo-600 transition-colors text-sm font-medium disabled:opacity-60"
          >
            <Sparkles className="w-4 h-4" />
            <span>{product.isBoosted ? 'Unfeature Listing' : 'Feature Listing'}</span>
          </button>
          <button
            onClick={handleHideListing}
            disabled={loadingKey !== null}
            className="w-full flex items-center space-x-2 px-4 py-2 hover:bg-amber-50 text-amber-700 transition-colors text-sm font-medium border-t border-gray-100 disabled:opacity-60"
          >
            <EyeOff className="w-4 h-4" />
            <span>Hide Listing</span>
          </button>
          <button
            onClick={handleDeleteListing}
            disabled={loadingKey !== null}
            className="w-full flex items-center space-x-2 px-4 py-2 hover:bg-red-50 text-red-600 transition-colors text-sm font-medium border-t border-gray-100 disabled:opacity-60"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Listing</span>
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setShowDropdown((prev) => !prev)
        }}
        className={buttonClassName}
        aria-label="Listing admin actions"
      >
        <MoreVertical className={iconClassName} />
      </button>
    </>
  )
}
