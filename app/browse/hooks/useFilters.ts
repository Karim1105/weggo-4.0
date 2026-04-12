import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DEFAULT_MAX_PRICE, DEFAULT_MIN_PRICE, DEFAULT_SORT } from '@/app/browse/types'
import { useDebouncedValue } from '@/app/browse/hooks/useDebouncedValue'

type PriceRange = [number, number]

interface FiltersState {
  selectedCategory: string
  selectedSubcategory: string
  locationFilter: string
  nearMeEnabled: boolean
  priceRange: PriceRange
  sortBy: string
}

const INITIAL_FILTERS: FiltersState = {
  selectedCategory: 'all',
  selectedSubcategory: 'all',
  locationFilter: '',
  nearMeEnabled: false,
  priceRange: [DEFAULT_MIN_PRICE, DEFAULT_MAX_PRICE],
  sortBy: DEFAULT_SORT,
}

const parsePrice = (value: string | null, fallback: number) => {
  if (value === null || value.trim() === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

export function useFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [filters, setFilters] = useState<FiltersState>(INITIAL_FILTERS)
  const [searchInput, setSearchInput] = useState('')

  const debouncedSearch = useDebouncedValue(searchInput, 250)

  useEffect(() => {
    const cat = searchParams.get('category') || 'all'
    const sub = searchParams.get('subcategory') || 'all'
    const loc = searchParams.get('location') || ''
    const search = searchParams.get('search') || ''
    const legacySort = searchParams.get('sortBy')
    const urlSort = searchParams.get('sort') || legacySort || DEFAULT_SORT
    const min = parsePrice(searchParams.get('minPrice'), DEFAULT_MIN_PRICE)
    const max = parsePrice(searchParams.get('maxPrice'), DEFAULT_MAX_PRICE)

    setSearchInput(search)
    setFilters({
      selectedCategory: cat,
      selectedSubcategory: sub,
      locationFilter: loc,
      nearMeEnabled: false,
      priceRange: [Math.min(min, max), Math.max(min, max)],
      sortBy: urlSort,
    })
  }, [searchParams])

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (filters.selectedCategory !== 'all') params.set('category', filters.selectedCategory.toLowerCase())
    if (filters.selectedSubcategory !== 'all') params.set('subcategory', filters.selectedSubcategory.toLowerCase())
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
    if (filters.locationFilter.trim()) params.set('location', filters.locationFilter.trim().toLowerCase())
    params.set('minPrice', String(filters.priceRange[0]))
    params.set('maxPrice', String(filters.priceRange[1]))
    params.set('sort', filters.sortBy)
    return params.toString()
  }, [debouncedSearch, filters])

  const sortQuery = useMemo(() => {
    const map: Record<string, string> = {
      newest: 'createdAt:desc',
      oldest: 'createdAt:asc',
      'price-low': 'price:asc,createdAt:desc',
      'price-high': 'price:desc,createdAt:desc',
      'rating-high': 'averageRating:desc,ratingCount:desc,createdAt:desc',
    }
    return map[filters.sortBy] ?? map.newest
  }, [filters.sortBy])

  useEffect(() => {
    const current = searchParams.toString()
    if (queryString !== current) {
      const nextUrl = queryString ? `?${queryString}` : window.location.pathname
      router.replace(nextUrl, { scroll: false })
    }
  }, [queryString, router, searchParams])

  const setSelectedCategory = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, selectedCategory: value, selectedSubcategory: 'all' }))
  }, [])

  const setSelectedSubcategory = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, selectedSubcategory: value }))
  }, [])

  const setLocationFilter = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, locationFilter: value, nearMeEnabled: false }))
  }, [])

  const setNearMeEnabled = useCallback((value: boolean) => {
    setFilters((prev) => ({ ...prev, nearMeEnabled: value }))
  }, [])

  const setPriceRange = useCallback((value: PriceRange) => {
    setFilters((prev) => ({ ...prev, priceRange: value }))
  }, [])

  const setSortBy = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, sortBy: value }))
  }, [])

  const clearFilters = useCallback(() => {
    setSearchInput('')
    setFilters(INITIAL_FILTERS)
  }, [])

  return {
    searchInput,
    setSearchInput,
    debouncedSearch,
    filters,
    sortQuery,
    queryString,
    setSelectedCategory,
    setSelectedSubcategory,
    setLocationFilter,
    setNearMeEnabled,
    setPriceRange,
    setSortBy,
    clearFilters,
  }
}
