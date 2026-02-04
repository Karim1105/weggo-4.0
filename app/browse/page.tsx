'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Search, Filter, Grid, List, Package, Heart, MapPin, Clock } from 'lucide-react'
import ProductCard from '@/components/ProductCard'
import { mapApiListingToProduct, categories as apiCategories, subcategoriesByCategory, withCsrfHeader } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import toast from 'react-hot-toast'

interface Product {
  id: string
  title: string
  price: number
  location: string
  condition: string
  image: string
  category: string
  subcategory?: string
  postedAt: string
  isFavorite: boolean
  seller?: {
    name: string
    rating?: number
    totalSales?: number
    verified?: boolean
  }
}

function BrowsePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all')
  const [locationFilter, setLocationFilter] = useState('')
  const [nearMeEnabled, setNearMeEnabled] = useState(false)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [priceRange, setPriceRange] = useState([0, 1000000])
  const [sortBy, setSortBy] = useState('newest')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isInitialMount, setIsInitialMount] = useState(true)
  const storeFavorites = useAppStore((s) => s.favorites)
  const addFavorite = useAppStore((s) => s.addFavorite)
  const removeFavorite = useAppStore((s) => s.removeFavorite)

  // Sync category/subcategory from URL on load and when URL changes
  useEffect(() => {
    const cat = searchParams.get('category') || 'all'
    const sub = searchParams.get('subcategory') || 'all'
    const loc = searchParams.get('location') || ''
    const search = searchParams.get('search') || ''
    setSelectedCategory(cat)
    setSelectedSubcategory(sub)
    setLocationFilter(loc)
    setSearchQuery(search)
  }, [searchParams])

  const categories = useMemo(() => ['all', ...apiCategories.map((c) => c.id)], [])
  const categoryLabels: Record<string, string> = useMemo(() => {
    const m: Record<string, string> = { all: 'All' }
    apiCategories.forEach((c) => { m[c.id] = c.name })
    return m
  }, [])
  const subcategories = useMemo(
    () => (selectedCategory && selectedCategory !== 'all' ? subcategoriesByCategory[selectedCategory] || [] : []),
    [selectedCategory]
  )

  // Update URL when category/subcategory change so links are shareable
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (selectedCategory === 'all') {
      params.delete('category')
      params.delete('subcategory')
    } else {
      params.set('category', selectedCategory)
      if (selectedSubcategory === 'all') params.delete('subcategory')
      else params.set('subcategory', selectedSubcategory)
    }
    if (searchQuery.trim()) params.set('search', searchQuery.trim())
    else params.delete('search')
    const q = params.toString()
    const newUrl = q ? `?${q}` : window.location.pathname
    if (window.location.search !== (q ? `?${q}` : '')) {
      router.replace(newUrl, { scroll: false })
    }
  }, [selectedCategory, selectedSubcategory, searchQuery, router, searchParams])

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'price-low', label: 'Price: Low to High' },
    { value: 'price-high', label: 'Price: High to Low' },
  ]

  const fetchWishlist = useCallback(async () => {
    try {
      const res = await fetch('/api/wishlist', { credentials: 'include' })
      const data = await res.json()
      if (data.success && Array.isArray(data.wishlist)) {
        setFavoriteIds(new Set(data.wishlist.map((p: { _id: string }) => p._id)))
      }
    } catch {
      setFavoriteIds(new Set(storeFavorites))
    }
  }, [storeFavorites])

  const fetchListings = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') params.set('category', selectedCategory)
      if (selectedSubcategory !== 'all') params.set('subcategory', selectedSubcategory)
      if (searchQuery.trim()) params.set('search', searchQuery.trim())
      if (locationFilter.trim()) params.set('location', locationFilter.trim())
      params.set('minPrice', String(priceRange[0]))
      params.set('maxPrice', String(priceRange[1]))
      params.set('sortBy', sortBy)
      params.set('page', String(page))
      params.set('limit', '20')
      const [listingsRes, wishlistRes] = await Promise.all([
        fetch(`/api/listings?${params}`, { credentials: 'include' }),
        fetch('/api/wishlist', { credentials: 'include' }).catch(() => null),
      ])
      const data = await listingsRes.json()
      const ids = new Set<string>(storeFavorites)
      if (wishlistRes) {
        const wData = await wishlistRes.json()
        if (wData?.success && Array.isArray(wData.wishlist)) {
          wData.wishlist.forEach((p: { _id: string }) => ids.add(p._id))
        }
      }
      setFavoriteIds(ids)
      const payload = data.data ?? data
      if (data.success && Array.isArray(payload?.listings)) {
        setProducts(payload.listings.map((l: any) => mapApiListingToProduct(l, ids)))
        setTotalPages(payload.totalPages ?? 1)
      } else {
        setProducts([])
      }
    } catch {
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, selectedSubcategory, searchQuery, locationFilter, priceRange, sortBy, page, storeFavorites])

  useEffect(() => {
    fetchWishlist()
  }, [fetchWishlist])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  // Mark initial mount complete after first render
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialMount(false), 100)
    return () => clearTimeout(timer)
  }, [])

  const toggleFavorite = (id: string) => {
    const product = products.find((p) => p.id === id)
    if (!product) return
    const nextFavorite = !product.isFavorite
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isFavorite: nextFavorite } : p))
    )
    if (nextFavorite) {
      setFavoriteIds((prev) => new Set([...prev, id]))
      addFavorite(id)
      fetch('/api/wishlist', {
        method: 'POST',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ productId: id }),
      }).catch(() => {})
    } else {
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      removeFavorite(id)
      fetch('/api/wishlist', {
        method: 'DELETE',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ productId: id }),
      }).catch(() => {})
    }
  }

  const displayedProducts = useMemo(
    () =>
      products.filter((product) => {
        if (selectedCategory !== 'all' && product.category !== selectedCategory) {
          return false
        }
        if (
          selectedSubcategory !== 'all' &&
          product.subcategory &&
          product.subcategory !== selectedSubcategory
        ) {
          return false
        }
        if (verifiedOnly && !product.seller?.verified) {
          return false
        }
        return true
      }),
    [products, selectedCategory, selectedSubcategory, verifiedOnly]
  )

  const applyNearMe = async () => {
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
  }

  const saveCurrentSearch = async () => {
    const name = window.prompt('Name this saved search (e.g., "iPhones in Cairo")')
    if (!name) return
    const params: Record<string, string> = {}
    if (selectedCategory !== 'all') params.category = selectedCategory
    if (selectedSubcategory !== 'all') params.subcategory = selectedSubcategory
    if (searchQuery.trim()) params.search = searchQuery.trim()
    if (locationFilter.trim()) params.location = locationFilter.trim()
    params.minPrice = String(priceRange[0])
    params.maxPrice = String(priceRange[1])
    params.sortBy = sortBy
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
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      {/* Header - positioned below main navbar */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Controls */}
            <div className="flex items-center space-x-4 w-full lg:w-auto justify-center lg:justify-start flex-wrap">
              {/* Filter Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </button>

              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-full p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-full transition-colors ${
                    viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-full transition-colors ${
                    viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
                  }`}
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

          {/* Filters Panel */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 p-6 bg-white/90 rounded-2xl border border-gray-200"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Categories */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Category</h3>
                  <div className="space-y-2">
                    {categories.map(catId => (
                      <label key={catId} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="category"
                          value={catId}
                          checked={selectedCategory === catId}
                          onChange={(e) => {
                            setSelectedCategory(e.target.value)
                            setSelectedSubcategory('all')
                          }}
                          className="text-primary-500 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">{categoryLabels[catId] ?? catId}</span>
                      </label>
                    ))}
                  </div>
                  {subcategories.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Subcategory</h4>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedSubcategory('all')}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            selectedSubcategory === 'all'
                              ? 'bg-primary-500 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          All
                        </button>
                        {subcategories.map((sub) => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => setSelectedSubcategory(sub.id)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                              selectedSubcategory === sub.id
                                ? 'bg-primary-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {sub.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Price Range */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Price Range</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Min Price</label>
                      <input
                        type="number"
                        value={priceRange[0]}
                        onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Max Price</label>
                      <input
                        type="number"
                        value={priceRange[1]}
                        onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 1000000])}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="1000000"
                      />
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Location</h3>
                  <input
                    type="text"
                    value={locationFilter}
                    onChange={(e) => {
                      setLocationFilter(e.target.value)
                      setNearMeEnabled(false)
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g. Cairo"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Tip: use “Near Me” if your profile has a location.
                  </p>
                </div>

                {/* Quick Filters */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Quick Filters</h3>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setVerifiedOnly((v) => !v)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Verified Sellers Only
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (nearMeEnabled) {
                          setNearMeEnabled(false)
                          setLocationFilter('')
                        } else {
                          applyNearMe()
                        }
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Near Me
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                      New Items
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Results - added extra top padding to prevent sticky header from hiding content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Subcategory chips when a category with subcategories is selected */}
        {!loading && subcategories.length > 0 && (
          <motion.div
            initial={isInitialMount ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ duration: isInitialMount ? 0 : 0.3, delay: isInitialMount ? 0 : 0.15 }}
            layout={false}
            className="mb-6 overflow-hidden"
          >
            <p className="text-sm font-medium text-gray-600 mb-2">
              {categoryLabels[selectedCategory] || selectedCategory} &rarr; choose subcategory
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedSubcategory('all')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedSubcategory === 'all'
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
                    selectedSubcategory === sub.id
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

        {/* Results Header */}
        <div className="flex items-center justify-between mb-8 min-h-[80px]">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {loading ? 'Loading...' : `${displayedProducts.length} items found`}
            </h1>
            <p className="text-gray-600 min-h-[24px]">
              {!loading && searchQuery && `Search results for "${searchQuery}"`}
              {!loading && selectedCategory !== 'all' && !searchQuery && (
                <span>
                  in {categoryLabels[selectedCategory] || selectedCategory}
                  {selectedSubcategory !== 'all' && subcategories.find(s => s.id === selectedSubcategory) && (
                    <span> &rarr; {subcategories.find(s => s.id === selectedSubcategory)?.name}</span>
                  )}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && displayedProducts.length === 0 && (
          <div key="loading-skeleton" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 min-h-[400px]">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-gray-200 rounded-2xl h-80" />
            ))}
          </div>
        )}

        {/* Products Grid/List */}
        {viewMode === 'grid' ? (
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${loading && displayedProducts.length > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
            {displayedProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={isInitialMount ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: isInitialMount ? 0 : 0.15 + index * 0.05 }}
                layout="position"
              >
                <ProductCard
                  product={product}
                  index={index}
                  onToggleFavorite={toggleFavorite}
                />
              </motion.div>
            ))}
          </div>
        ) : viewMode === 'list' ? (
          <div className={`space-y-4 ${loading && displayedProducts.length > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
            {displayedProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={isInitialMount ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: isInitialMount ? 0 : 0.15 + index * 0.05 }}
                layout="position"
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex space-x-4">
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-24 h-24 object-cover rounded-xl"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {product.title}
                    </h3>
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-2xl font-bold text-primary-600">
                          {product.price.toLocaleString()} EGP
                        </span>
                        <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                          {product.condition}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleFavorite(product.id)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <Heart className={`w-5 h-5 ${product.isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : null}

        {/* No Results */}
        {!loading && displayedProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your search or filter criteria
            </p>
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('all')
                setSelectedSubcategory('all')
                setPriceRange([0, 1000000])
              }}
              className="px-6 py-3 bg-primary-500 text-white rounded-full font-semibold hover:bg-primary-600 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function BrowsePage() {
  return (
    <Suspense fallback={null}>
      <BrowsePageInner />
    </Suspense>
  )
}


