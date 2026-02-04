'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'
import ProductCard from '@/components/ProductCard'
import { mapApiListingToProduct, withCsrfHeader } from '@/lib/utils'
import { useAppStore } from '@/lib/store'

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
  seller?: { name: string; rating?: number; totalSales?: number; verified?: boolean }
}

export default function FavoritesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const addFavorite = useAppStore((s) => s.addFavorite)
  const removeFavorite = useAppStore((s) => s.removeFavorite)
  const storeFavorites = useAppStore((s) => s.favorites)

  const fetchWishlist = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/wishlist', { credentials: 'include' })
      const data = await res.json()
      if (res.status === 401) return
      if (data.success && Array.isArray(data.wishlist)) {
        const ids = new Set<string>(data.wishlist.map((p: { _id: string }) => p._id))
        const mapped = data.wishlist.map((l: any) => mapApiListingToProduct(l, ids))
        setProducts(mapped)
      } else {
        setProducts([])
      }
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWishlist()
  }, [fetchWishlist])

  const toggleFavorite = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId))
    removeFavorite(productId)
    fetch('/api/wishlist', {
      method: 'DELETE',
      headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ productId }),
    }).catch(() => {})
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-red-600 rounded-2xl flex items-center justify-center">
              <Heart className="w-8 h-8 text-white fill-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">My Favorites</h1>
              <p className="text-gray-600">Items you have saved for later</p>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse bg-gray-200 rounded-2xl h-80" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <Heart className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No favorites yet</h2>
            <p className="text-gray-600 mb-6">Start adding items from browse.</p>
            <Link href="/browse" className="inline-block gradient-primary text-white px-8 py-3 rounded-full font-semibold">
              Browse items
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
