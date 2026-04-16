'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Filter, Grid, List } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import FiltersPanel from '@/app/browse/components/FiltersPanel'
import ResultsHeader, { EmptyResults } from '@/app/browse/components/ResultsHeader'
import ProductGrid from '@/app/browse/components/ProductGrid'
import LoadMoreButton from '@/app/browse/components/LoadMoreButton'
import { useFilters } from '@/app/browse/hooks/useFilters'
import { useListings } from '@/app/browse/hooks/useListings'
import { DEFAULT_MAX_PRICE, DEFAULT_MIN_PRICE, DEFAULT_SORT, SORT_OPTIONS } from '@/app/browse/types'
import { categories as apiCategories, subcategoriesByCategory, withCsrfHeader } from '@/lib/utils'
import { useFavorites } from '@/lib/hooks/useFavorites'

export default function BrowsePageContainer() {
  const router = useRouter()
  const { syncFavorite } = useFavorites()

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)

  const {
    searchInput,
    filters,
    queryString,
    sortQuery,
    setSelectedCategory,
    setSelectedSubcategory,
    setLocationFilter,
    setNearMeEnabled,
    setPriceRange,
    setSortBy,
    clearFilters,
  } = useFilters()

  const { products, loading, loadingMore, hasMore, totalCount, loadMore, toggleLocalFavorite } = useListings(queryString, sortQuery)

  const categories = useMemo(() => ['all', ...apiCategories.map((c) => c.id)], [])
  const categoryLabels: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = { all: 'All' }
    apiCategories.forEach((c) => {
      map[c.id] = c.name
    })
    return map
  }, [])

  const subcategories = useMemo(
    () =>
      filters.selectedCategory && filters.selectedCategory !== 'all'
        ? subcategoriesByCategory[filters.selectedCategory] || []
        : [],
    [filters.selectedCategory]
  )

  const toggleFavorite = useCallback(
    (id: string) => {
      const product = products.find((p) => p.id === id)
      if (!product) return

      const nextFavorite = !product.isFavorite
      toggleLocalFavorite(id, nextFavorite)

      void syncFavorite(id, nextFavorite)
    },
    [products, syncFavorite, toggleLocalFavorite]
  )

  const applyNearMe = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      const data = await res.json()
      const loc = data?.user?.location
      if (data.success && loc) {
        setNearMeEnabled(true)
        setLocationFilter(loc)
        return
      }
    } catch {
      // ignore
    }
    setNearMeEnabled(false)
  }, [setLocationFilter, setNearMeEnabled])

  const saveCurrentSearch = useCallback(async () => {
    const name = window.prompt('Name this saved search (e.g., "iPhones in Cairo")')
    if (!name) return

    const params: Record<string, string> = {}
    if (filters.selectedCategory !== 'all') params.category = filters.selectedCategory
    if (filters.selectedSubcategory !== 'all') params.subcategory = filters.selectedSubcategory
    if (searchInput.trim()) params.search = searchInput.trim()
    if (filters.locationFilter.trim()) params.location = filters.locationFilter.trim()
    params.minPrice = String(filters.priceRange[0])
    params.maxPrice = String(filters.priceRange[1])
    params.sortBy = filters.sortBy

    try {
      const res = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ name, params }),
      })

      if (res.status === 401) {
        toast.error('Please log in to save searches')
        router.push('/login?redirect=/browse')
        return
      }

      const data = await res.json()
      if (data.success) {
        toast.success('Saved search')
      } else {
        toast.error(data.error || 'Failed to save')
      }
    } catch {
      toast.error('Failed to save')
    }
  }, [filters, router, searchInput])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 md:py-6">
          <div className="flex flex-col lg:flex-row gap-3 md:gap-4 items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4 w-full lg:w-auto justify-center lg:justify-start flex-wrap gap-2">
              <button
                onClick={() => setShowFilters((prev) => !prev)}
                className="flex items-center space-x-2 px-3 sm:px-4 py-2 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors text-sm"
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </button>

              <select
                value={filters.sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 sm:px-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white text-sm"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <div className="flex bg-gray-100 rounded-full p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  aria-label="Grid view"
                  className={`p-2 rounded-full transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  aria-label="List view"
                  className={`p-2 rounded-full transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={saveCurrentSearch}
                className="px-4 py-2 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
              >
                Save search
              </button>
            </div>
          </div>

          {showFilters && (
            <FiltersPanel
              categories={categories}
              categoryLabels={categoryLabels}
              selectedCategory={filters.selectedCategory}
              selectedSubcategory={filters.selectedSubcategory}
              priceRange={filters.priceRange}
              locationFilter={filters.locationFilter}
              nearMeEnabled={filters.nearMeEnabled}
              onCategoryChange={setSelectedCategory}
              onSubcategoryChange={setSelectedSubcategory}
              onPriceRangeChange={setPriceRange}
              onLocationChange={setLocationFilter}
              onNearMeToggle={() => {
                if (filters.nearMeEnabled) {
                  setNearMeEnabled(false)
                  setLocationFilter('')
                } else {
                  applyNearMe()
                }
              }}
            />
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {!loading && subcategories.length > 0 && (
          <motion.div
            initial={false}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: 0.3 }}
            layout={false}
            className="mb-6 overflow-hidden"
          >
            <p className="text-sm font-medium text-gray-600 mb-2">
              {categoryLabels[filters.selectedCategory] || filters.selectedCategory} &rarr; choose subcategory
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedSubcategory('all')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filters.selectedSubcategory === 'all'
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-primary-50'
                }`}
              >
                All
              </button>
              {subcategories.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedSubcategory(sub.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    filters.selectedSubcategory === sub.id
                      ? 'bg-primary-500 text-white shadow-md'
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-primary-50'
                  }`}
                >
                  {sub.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <ResultsHeader
          loading={loading}
          products={products}
          totalCount={totalCount}
          searchQuery={searchInput}
          selectedCategory={filters.selectedCategory}
          selectedSubcategory={filters.selectedSubcategory}
          categoryLabels={categoryLabels}
          subcategories={subcategories}
        />

        <ProductGrid viewMode={viewMode} products={products} loading={loading} onToggleFavorite={toggleFavorite} />

        <LoadMoreButton visible={!loading && products.length > 0 && hasMore} loading={loadingMore} onClick={loadMore} />

        {!loading && products.length > 0 && !hasMore && (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white/90 p-6 text-center">
            <p className="text-sm font-medium text-gray-800">No more listings right now</p>
            <p className="mt-1 text-xs text-gray-500">Try changing filters or check back later.</p>
          </div>
        )}

        {!loading && products.length === 0 && <EmptyResults onClearFilters={() => {
          clearFilters()
          setSortBy(DEFAULT_SORT)
          setPriceRange([DEFAULT_MIN_PRICE, DEFAULT_MAX_PRICE])
        }} />}
      </div>
    </div>
  )
}
