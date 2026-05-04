'use client'

import { useEffect, useState, useCallback } from 'react'
import ProductGrid from '@/app/browse/components/ProductGrid'
import { Product } from '@/app/browse/types'
import { mapApiListingToProduct, withCsrfHeader } from '@/lib/utils'
import { useAppStore } from '@/lib/store'

export default function RecentlyViewed() {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const storeFavorites = useAppStore((s) => s.favorites)
  const addFavorite = useAppStore((s) => s.addFavorite)
  const removeFavorite = useAppStore((s) => s.removeFavorite)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const recentRes = await fetch('/api/recently-viewed', { credentials: 'include' }).catch(() => null)

      if (!recentRes?.ok) {
        setItems([])
        return
      }

      const recentData = await recentRes.json()
      if (!recentData.success || !Array.isArray(recentData.products)) {
        setItems([])
        return
      }

      const ids = new Set(storeFavorites)

      setItems(recentData.products.map((p: any) => mapApiListingToProduct(p, ids)))
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [storeFavorites])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const ids = new Set(storeFavorites)
    setItems((prev) => prev.map((p) => ({ ...p, isFavorite: ids.has(p.id) })))
  }, [storeFavorites])

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
        <ProductGrid
          viewMode="grid"
          products={items.slice(0, 8)}
          loading={false}
          onToggleFavorite={toggleFavorite}
          onOpenProduct={() => {}}
          isAdmin={false}
          adminControlsEnabled={false}
          onAdminProductUpdate={() => {}}
          onAdminProductRemove={() => {}}
        />
      </div>
    </section>
  )
}
