import { useCallback, useEffect, useMemo, useState } from 'react'
import { mapApiListingToProduct } from '@/lib/utils'
import { ApiListing, ListingsResponsePayload, Product } from '@/app/browse/types'

function parseListingsPayload(data: unknown): ListingsResponsePayload | null {
  if (!data || typeof data !== 'object') return null
  const wrapped = data as { success?: boolean; data?: ListingsResponsePayload }
  if (!wrapped.success || !wrapped.data || !Array.isArray(wrapped.data.listings)) {
    return null
  }
  return wrapped.data
}

async function fetchWishlistIds(signal?: AbortSignal): Promise<Set<string>> {
  const ids = new Set<string>()

  try {
    const wishlistRes = await fetch('/api/wishlist', {
      credentials: 'include',
      signal,
    })

    if (!wishlistRes.ok) {
      return ids
    }

    const payload = (await wishlistRes.json()) as { success?: boolean; wishlist?: { _id: string }[] }
    if (payload?.success && Array.isArray(payload.wishlist)) {
      payload.wishlist.forEach((item) => ids.add(item._id))
    }
  } catch {
    return ids
  }

  return ids
}

function buildApiUrl(baseQueryString: string, sortQuery: string, cursor?: string | null): string {
  const params = new URLSearchParams(baseQueryString)
  params.delete('sortBy')
  params.set('sort', sortQuery)
  params.set('limit', '20')
  if (cursor) params.set('cursor', cursor)
  return `/api/listings?${params.toString()}`
}

export function useListings(baseQueryString: string, sortQuery: string) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const queryKey = useMemo(() => `${baseQueryString}|${sortQuery}`, [baseQueryString, sortQuery])

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean, signal?: AbortSignal) => {
      const listingsRes = await fetch(buildApiUrl(baseQueryString, sortQuery, cursor), {
        credentials: 'include',
        signal,
      })

      if (!listingsRes.ok) {
        if (!append) {
          setProducts([])
          setNextCursor(null)
          setHasMore(false)
        }
        return
      }

      const rawData = await listingsRes.json()
      const payload = parseListingsPayload(rawData)

      if (!payload) {
        if (!append) {
          setProducts([])
          setNextCursor(null)
          setHasMore(false)
        }
        return
      }

      setNextCursor(payload.nextCursor ?? null)
      setHasMore(Boolean(payload.hasMore))

      if (!append) {
        const favoriteIds = await fetchWishlistIds(signal)
        setProducts(payload.listings.map((listing: ApiListing) => mapApiListingToProduct(listing, favoriteIds)))
        return
      }

      setProducts((prev) => {
        const favoriteIds = new Set(prev.filter((item) => item.isFavorite).map((item) => item.id))
        const existingIds = new Set(prev.map((item) => item.id))
        const mapped = payload.listings
          .map((listing: ApiListing) => mapApiListingToProduct(listing, favoriteIds))
          .filter((item: Product) => !existingIds.has(item.id))
        return [...prev, ...mapped]
      })
    },
    [baseQueryString, sortQuery]
  )

  useEffect(() => {
    const controller = new AbortController()

    const load = async () => {
      setLoading(true)
      try {
        await fetchPage(null, false, controller.signal)
      } catch (error) {
        if ((error as DOMException).name !== 'AbortError') {
          setProducts([])
          setNextCursor(null)
          setHasMore(false)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    load()
    return () => controller.abort()
  }, [fetchPage, queryKey])

  const loadMore = useCallback(async () => {
    if (!nextCursor || loading || loadingMore) return

    setLoadingMore(true)
    try {
      await fetchPage(nextCursor, true)
    } finally {
      setLoadingMore(false)
    }
  }, [fetchPage, loading, loadingMore, nextCursor])

  const toggleLocalFavorite = useCallback((id: string, nextFavorite: boolean) => {
    setProducts((prev) => prev.map((item) => (item.id === id ? { ...item, isFavorite: nextFavorite } : item)))
  }, [])

  return {
    products,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    toggleLocalFavorite,
  }
}
