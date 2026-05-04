'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Heart, MapPin, Clock } from 'lucide-react'
import ProductCard from '@/components/ProductCard'
import ListingAdminMenu from '@/components/admin/ListingAdminMenu'
import { Product } from '@/app/browse/types'

interface ProductGridProps {
  viewMode: 'grid' | 'list'
  products: Product[]
  loading: boolean
  onToggleFavorite: (id: string) => void
  onOpenProduct: (productId: string) => void
  isAdmin: boolean
  adminControlsEnabled: boolean
  onAdminProductUpdate: (id: string, updates: Partial<Product>) => void
  onAdminProductRemove: (id: string) => void
}

export default function ProductGrid({
  viewMode,
  products,
  loading,
  onToggleFavorite,
  onOpenProduct,
  isAdmin,
  adminControlsEnabled,
  onAdminProductUpdate,
  onAdminProductRemove,
}: ProductGridProps) {
  if (loading && products.length === 0) {
    return (
      <div key="loading-skeleton" className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 min-h-[400px]">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-gray-200 rounded-2xl h-80" />
        ))}
      </div>
    )
  }

  if (viewMode === 'grid') {
    return (
      <div className={`grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${loading && products.length > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
        {products.map((product) => (
          <motion.div key={product.id} layout="position" transition={{ duration: 0.12 }} data-browse-product-id={product.id} className="h-full">
            <ProductCard
              product={product}
              onToggleFavorite={onToggleFavorite}
              onOpenProduct={onOpenProduct}
              isAdmin={isAdmin}
              adminControlsEnabled={adminControlsEnabled}
              onAdminUpdate={onAdminProductUpdate}
              onAdminRemove={onAdminProductRemove}
            />
          </motion.div>
        ))}
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${loading && products.length > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
      {products.map((product) => (
        <motion.div
          key={product.id}
          initial={{ opacity: 0, x: 12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          layout="position"
          data-browse-product-id={product.id}
          className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex space-x-4">
            <Link href={`/listings/${product.id}`} className="flex flex-1 space-x-4 min-w-0" onClick={() => onOpenProduct(product.id)}>
              <img src={product.image} alt={product.title} className="w-24 h-24 object-cover rounded-xl" />
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">{product.title}</h3>
                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>{product.location}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{product.postedAt}</span>
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-2xl font-bold text-primary-600">{product.price.toLocaleString()} EGP</span>
                  <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">{product.condition}</span>
                </div>
              </div>
            </Link>
            <div className="flex items-start">
              {isAdmin && adminControlsEnabled ? (
                <div className="relative">
                  <ListingAdminMenu
                    product={product}
                    onUpdate={onAdminProductUpdate}
                    onRemove={onAdminProductRemove}
                    buttonClassName="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    iconClassName="w-5 h-5 text-gray-600"
                    menuClassName="absolute right-0 top-10 bg-white rounded-lg shadow-xl z-50 overflow-hidden"
                  />
                </div>
              ) : (
                <button
                  onClick={() => onToggleFavorite(product.id)}
                  aria-label={product.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Heart className={`w-5 h-5 ${product.isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'}`} />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
