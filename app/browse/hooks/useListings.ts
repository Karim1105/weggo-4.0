import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { mapApiListingToProduct } from '@/lib/utils'
import { getListings } from '@/lib/api/listings/client'
import { useFavorites } from '@/lib/hooks/useFavorites'
import { ApiListing, ListingsResponsePayload, Product } from '@/app/browse/types'

function parseListingsPayload(data: unknown): ListingsResponsePayload | null {
  if (!data || typeof data !== 'object') return null
  const wrapped = data as { success?: boolean; data?: ListingsResponsePayload }
  if (!wrapped.success || !wrapped.data || !Array.isArray(wrapped.data.listings)) {
    return null
  }
  return wrapped.data
}

export function useListings(baseQueryString: string, sortQuery: string) {
  const { favoriteIdsSet } = useFavorites()
  const favoriteIdsRef = useRef<Set<string>>(favoriteIdsSet)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const queryKey = useMemo(() => `${baseQueryString}|${sortQuery}`, [baseQueryString, sortQuery])

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      const listingsRes = await getListings({
        query: baseQueryString,
        sort: sortQuery,
        limit: 20,
        cursor,
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
        setProducts(payload.listings.map((listing: ApiListing) => mapApiListingToProduct(listing, favoriteIdsRef.current)))
        return
      }

      setProducts((prev) => {
        const existingIds = new Set(prev.map((item) => item.id))
        const mapped = payload.listings
          .map((listing: ApiListing) => mapApiListingToProduct(listing, favoriteIdsRef.current))
          .filter((item: Product) => !existingIds.has(item.id))
        return [...prev, ...mapped]
      })
    },
    [baseQueryString, sortQuery]
  )

  useEffect(() => {
    favoriteIdsRef.current = favoriteIdsSet
    setProducts((prev) => prev.map((item) => ({ ...item, isFavorite: favoriteIdsSet.has(item.id) })))
  }, [favoriteIdsSet])

  useEffect(() => {
    const controller = new AbortController()

    const load = async () => {
      setLoading(true)
      try {
        await fetchPage(null, false)
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
