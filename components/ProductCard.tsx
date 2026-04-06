'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Heart, MapPin, Clock, MoreVertical, Trash2, Ban } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import { withCsrfHeader } from '@/lib/utils'

interface Product {
  id: string
  title: string
  price: number
  location: string
  condition: string
  image: string
  category: string
  postedAt: string
  isFavorite: boolean
  seller?: {
    id?: string
    name: string
    rating?: number
    totalSales?: number
    verified?: boolean
  }
}

interface ProductCardProps {
  product: Product
  index: number
  onToggleFavorite: (id: string) => void
  isAdmin?: boolean
}

export default function ProductCard({ product, index, onToggleFavorite, isAdmin = false }: ProductCardProps) {
  const [showDropdown, setShowDropdown] = useState(false)
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

  const handleDeleteListing = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const response = await fetch(`/api/listings/${product.id}`, {
        method: 'DELETE',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        credentials: 'include',
      })

      if (response.ok) {
        toast.success('Listing deleted successfully')
        setShowDropdown(false)
        // Optionally trigger a refresh or remove from UI
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to delete listing')
      }
    } catch (error) {
      toast.error('Error deleting listing')
      console.error(error)
    }
  }

  const handleBanUser = async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!product.seller?.id) {
      toast.error('Seller ID not available')
      return
    }

    try {
      const response = await fetch(`/api/admin/ban-user`, {
        method: 'POST',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          userId: product.seller.id,
          reason: 'Banned by admin from product listing'
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`User banned successfully and ${data.data.listingsDeleted} listings removed`)
        setShowDropdown(false)
      } else {
        toast.error(data.error || 'Failed to ban user')
      }
    } catch (error) {
      toast.error('Error banning user')
      console.error(error)
    }
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="card-modern group cursor-pointer hover-lift relative"
    >
      {/* Admin Dropdown - Outside Link to prevent navigation */}
      {isAdmin && showDropdown && (
        <div className="absolute top-12 right-4 bg-white rounded-lg shadow-xl z-50 overflow-hidden" ref={dropdownRef}>
          <button
            onClick={handleDeleteListing}
            className="w-full flex items-center space-x-2 px-4 py-2 hover:bg-red-50 text-red-600 transition-colors text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Listing</span>
          </button>
          <button
            onClick={handleBanUser}
            className="w-full flex items-center space-x-2 px-4 py-2 hover:bg-orange-50 text-orange-600 transition-colors text-sm font-medium border-t border-gray-100"
          >
            <Ban className="w-4 h-4" />
            <span>Ban User</span>
          </button>
        </div>
      )}

      <Link href={`/listings/${product.id}`} className="block">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />

        {/* Favorite Button or Admin Dropdown Button */}
        {isAdmin ? (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowDropdown(!showDropdown)
            }}
            className="absolute top-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite(product.id)
            }}
            className="absolute top-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                product.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600'
              }`}
            />
          </motion.button>
        )}

        {/* Condition Badge */}
        <div className="absolute top-3 left-3 px-3 py-1 bg-primary-500 text-white text-xs font-medium rounded-full">
          {product.condition}
        </div>

        {/* Category Badge */}
        <div className="absolute bottom-3 left-3 px-3 py-1 glass-effect text-xs font-medium rounded-full">
          {product.category}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
          {product.title}
        </h3>

        <div className="space-y-2 mb-3">
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-1" />
            <span className="line-clamp-1">{product.location}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Clock className="w-4 h-4 mr-1" />
            <span>{product.postedAt}</span>
          </div>
        </div>

        {/* Seller Info */}
        {product.seller && (
          <div className="mb-3 p-2 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">{product.seller.name}</span>
                {product.seller.verified && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    ✓ Verified
                  </span>
                )}
              </div>
              {(product.seller.rating != null || product.seller.totalSales != null) && (
                <div className="flex items-center space-x-1">
                  {product.seller.rating != null && (
                    <span className="text-sm text-gray-600">⭐ {product.seller.rating}</span>
                  )}
                  {product.seller.totalSales != null && (
                    <span className="text-xs text-gray-500">({product.seller.totalSales})</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-2xl font-bold text-primary-600">
            {product.price.toLocaleString()} EGP
          </p>
          <span className="px-4 py-2 gradient-primary text-white text-sm font-medium rounded-lg">
            View
          </span>
        </div>
      </div>
      </Link>
    </motion.div>
  )
}

