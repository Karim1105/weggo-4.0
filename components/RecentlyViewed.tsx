'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import ProductCard from '@/components/ProductCard'
import { mapApiListingToProduct, withCsrfHeader } from '@/lib/utils'
import { useAppStore } from '@/lib/store'

interface ProductCardShape {
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
    name: string
    rating?: number
    totalSales?: number
    verified?: boolean
  }
}

export default function RecentlyViewed() {
  const [items, setItems] = useState<ProductCardShape[]>([])
  const [loading, setLoading] = useState(true)
  const storeFavorites = useAppStore((s) => s.favorites)
  const addFavorite = useAppStore((s) => s.addFavorite)
  const removeFavorite = useAppStore((s) => s.removeFavorite)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [recentRes, wishlistRes] = await Promise.all([
        fetch('/api/recently-viewed', { credentials: 'include' }).catch(() => null),
        fetch('/api/wishlist', { credentials: 'include' }).catch(() => null),
      ])

      if (!recentRes?.ok) {
        setItems([])
        return
      }

      const recentData = await recentRes.json()
      if (!recentData.success || !Array.isArray(recentData.products)) {
        setItems([])
        return
      }

      const ids = new Set<string>()
      if (wishlistRes?.ok) {
        const wData = await wishlistRes.json()
        if (wData?.success && Array.isArray(wData.wishlist)) {
          wData.wishlist.forEach((p: { _id: string }) => ids.add(p._id))
        }
      }

      setItems(recentData.products.map((p: any) => mapApiListingToProduct(p, ids)))
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleFavorite = (id: string) => {
    const isFav = storeFavorites.includes(id)
    if (isFav) {
      removeFavorite(id)
      fetch('/api/wishlist', {
        method: 'DELETE',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ productId: id }),
      }).catch(() => {})
    } else {
      addFavorite(id)
      fetch('/api/wishlist', {
        method: 'POST',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ productId: id }),
      }).catch(() => {})
    }
    setItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p))
    )
  }

  if (loading) return null
  if (items.length === 0) return null

  return (
    <section className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recently viewed</h2>
          <button
            type="button"
            onClick={fetchData}
            className="text-sm text-primary-600 hover:underline"
          >
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.slice(0, 8).map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
            >
              <ProductCard product={product} index={index} onToggleFavorite={toggleFavorite} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
