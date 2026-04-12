'use client'

import { useCallback, useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { withCsrfHeader } from '@/lib/utils'

export function useFavorites() {
  const favorites = useAppStore((s) => s.favorites)
  const setFavorites = useAppStore((s) => s.setFavorites)
  const addFavorite = useAppStore((s) => s.addFavorite)
  const removeFavorite = useAppStore((s) => s.removeFavorite)

  const favoriteIdsSet = useMemo(() => new Set(favorites), [favorites])

  const refreshFavorites = useCallback(async () => {
    try {
      const res = await fetch('/api/wishlist?idsOnly=true&limit=100', { credentials: 'include' })
      if (!res.ok) {
        setFavorites([])
        return
      }
      const data = await res.json()
      if (data?.success && Array.isArray(data.wishlist)) {
        setFavorites(data.wishlist.map((item: { _id: string }) => item._id).filter(Boolean))
      }
    } catch {
      setFavorites([])
    }
  }, [setFavorites])

  const syncFavorite = useCallback(async (id: string, nextFavorite: boolean) => {
    if (nextFavorite) {
      addFavorite(id)
    } else {
      removeFavorite(id)
    }

    await fetch('/api/wishlist', {
      method: nextFavorite ? 'POST' : 'DELETE',
      headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ productId: id }),
    }).catch(() => {})
  }, [addFavorite, removeFavorite])

  return {
    favorites,
    favoriteIdsSet,
    refreshFavorites,
    syncFavorite,
    addFavorite,
    removeFavorite,
  }
}
