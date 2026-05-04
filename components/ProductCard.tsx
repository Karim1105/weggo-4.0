'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Heart, MapPin, Clock } from 'lucide-react'
import { getProductCardActionVariant } from '@/lib/ui/role-ui'
import { Product } from '@/app/browse/types'
import ListingAdminMenu from '@/components/admin/ListingAdminMenu'

interface ProductCardProps {
  product: Product
  index?: number
  onToggleFavorite: (id: string) => void
  onOpenProduct?: (productId: string) => void
  isAdmin?: boolean
  adminControlsEnabled?: boolean
  onAdminUpdate?: (id: string, updates: Partial<Product>) => void
  onAdminRemove?: (id: string) => void
}

export default function ProductCard({
  product,
  onToggleFavorite,
  onOpenProduct,
  isAdmin = false,
  adminControlsEnabled = false,
  onAdminUpdate,
  onAdminRemove,
}: ProductCardProps) {
  const actionVariant = getProductCardActionVariant(isAdmin)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.985 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="card-modern group cursor-pointer hover-lift relative"
    >
      {/* Admin Dropdown - Outside Link to prevent navigation */}
      <Link href={`/listings/${product.id}`} className="block" onClick={() => onOpenProduct?.(product.id)}>
      {/* Image */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />

        {/* Favorite Button or Admin Dropdown Button */}
        {actionVariant === 'admin-menu' && adminControlsEnabled ? (
          <div className="absolute top-3 right-3">
            <ListingAdminMenu product={product} onUpdate={onAdminUpdate} onRemove={onAdminRemove} />
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleFavorite(product.id)
            }}
            aria-label={product.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
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
          <div className="flex items-center gap-2">
            {product.isBoosted ? (
              <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-semibold">
                Featured
              </span>
            ) : null}
            <span className="px-4 py-2 gradient-primary text-white text-sm font-medium rounded-lg">
              View
            </span>
          </div>
        </div>
      </div>
      </Link>
    </motion.div>
  )
}
