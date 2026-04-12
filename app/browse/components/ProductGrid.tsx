'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Heart, MapPin, Clock } from 'lucide-react'
import ProductCard from '@/components/ProductCard'
import { Product } from '@/app/browse/types'

interface ProductGridProps {
  viewMode: 'grid' | 'list'
  products: Product[]
  loading: boolean
  onToggleFavorite: (id: string) => void
}

export default function ProductGrid({ viewMode, products, loading, onToggleFavorite }: ProductGridProps) {
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
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 + index * 0.03 }}
            layout="position"
          >
            <ProductCard product={product} index={index} onToggleFavorite={onToggleFavorite} />
          </motion.div>
        ))}
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${loading && products.length > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
      {products.map((product, index) => (
        <motion.div
          key={product.id}
          initial={false}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 + index * 0.03 }}
          layout="position"
          className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex space-x-4">
            <Link href={`/listings/${product.id}`} className="flex flex-1 space-x-4 min-w-0">
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
              <button
                onClick={() => onToggleFavorite(product.id)}
                aria-label={product.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Heart className={`w-5 h-5 ${product.isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'}`} />
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
