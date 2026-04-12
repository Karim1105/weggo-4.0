'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'

export default function WishlistHydrator() {
  const setFavorites = useAppStore((s) => s.setFavorites)

  useEffect(() => {
    const loadWishlist = async () => {
      try {
        const res = await fetch('/api/wishlist?limit=100&idsOnly=true', { credentials: 'include' })
        if (!res.ok) {
          setFavorites([])
          return
        }
        const data = await res.json()
        if (!data?.success || !Array.isArray(data.wishlist)) {
          setFavorites([])
          return
        }
        setFavorites(data.wishlist.map((item: { _id: string }) => item._id).filter(Boolean))
      } catch {
        setFavorites([])
      }
    }

    loadWishlist()
  }, [setFavorites])

  return null
}
