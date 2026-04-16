'use client'

import type { KeyboardEvent, TouchEvent } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Grid,
  Layout,
  MapPin,
  Search,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react'
import ProductCard from './ProductCard'
import { mapApiListingToProduct, withCsrfHeader } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { getListings } from '@/lib/api/listings/client'

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
  seller?: {
    id?: string
    name: string
    rating?: number
    totalSales?: number
    verified?: boolean
  }
}

interface RecommendationState {
  badge: string
  note: string
  tone: 'personalized' | 'fallback' | 'signed-out'
}

interface RecommendationsResponse {
  success?: boolean
  recommendations?: unknown[]
  strategy?: 'preference-based' | 'popular-fallback'
  signals?: {
    wishlistCategories?: string[]
    recentCategories?: string[]
    recentSubcategories?: string[]
    locationMatched?: boolean
    recentViewCount?: number
  }
}

const DEFAULT_RECOMMENDATION_STATE: RecommendationState = {
  badge: 'Personalized discovery',
  note: 'We use your wishlist, recent browsing, and location when available to surface relevant active listings.',
  tone: 'personalized',
}

function buildRecommendationState(data: RecommendationsResponse): RecommendationState {
  const signals = data.signals || {}
  const signalParts: string[] = []

  if ((signals.wishlistCategories?.length || 0) > 0) {
    signalParts.push('wishlist categories')
  }
  if ((signals.recentCategories?.length || 0) > 0 || (signals.recentViewCount || 0) > 0) {
    signalParts.push('recent browsing')
  }
  if (signals.locationMatched) {
    signalParts.push('your location')
  }

  if (data.strategy === 'popular-fallback') {
    return {
      badge: 'Fresh picks while we learn',
      note:
        'We do not have enough preference signals yet, so this view is showing popular active listings for now.',
      tone: 'fallback',
    }
  }

  if (signalParts.length === 0) {
    return DEFAULT_RECOMMENDATION_STATE
  }

  return {
    badge: 'Personalized discovery',
    note: `Based on ${signalParts.join(', ')}.`,
    tone: 'personalized',
  }
}

export default function PersonalizedFeed() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [filter, setFilter] = useState<'all' | 'recommended' | 'nearby' | 'trending'>('recommended')
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'carousel'>('carousel')
  const [currentSlide, setCurrentSlide] = useState(0)
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')
  const [slidesToShow, setSlidesToShow] = useState(4)
  const [recommendationState, setRecommendationState] = useState<RecommendationState>(DEFAULT_RECOMMENDATION_STATE)
  const touchStartXRef = useRef<number | null>(null)
  const touchEndXRef = useRef<number | null>(null)
  const storeFavorites = useAppStore((s) => s.favorites)
  const addFavorite = useAppStore((s) => s.addFavorite)
  const removeFavorite = useAppStore((s) => s.removeFavorite)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setSlidesToShow(1)
      } else if (window.innerWidth < 1024) {
        setSlidesToShow(2)
      } else {
        setSlidesToShow(4)
      }
      setCurrentSlide(0)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const fetchAllItems = useCallback(
    async (options?: { skipLoading?: boolean }) => {
      if (!options?.skipLoading) {
        setIsLoading(true)
      }

      try {
        const listingsRes = await getListings({ limit: 16, sort: 'createdAt:desc', includeTotal: false })
        const listingsData = await listingsRes.json()
        const rawListings = listingsData.data?.listings ?? listingsData.listings
        const listings: any[] = listingsData.success && Array.isArray(rawListings) ? rawListings : []
        const ids = new Set(storeFavorites)
        setProducts(listings.map((listing: any) => mapApiListingToProduct(listing, ids)))
      } catch {
        setProducts([])
      } finally {
        if (!options?.skipLoading) {
          setIsLoading(false)
        }
      }
    },
    [storeFavorites]
  )

  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true)

    try {
      const recommendationsRes = await fetch('/api/recommendations', { credentials: 'include' })

      if (recommendationsRes.status === 401) {
        setRecommendationState({
          badge: 'Sign in to personalize',
          note: 'You need to be logged in for recommendation signals. Showing fresh listings for now.',
          tone: 'signed-out',
        })
        await fetchAllItems({ skipLoading: true })
        return
      }

      if (!recommendationsRes.ok) {
        setRecommendationState({
          badge: 'Fresh picks for now',
          note: 'Recommendations are temporarily unavailable, so this view is falling back to the newest active listings.',
          tone: 'fallback',
        })
        await fetchAllItems({ skipLoading: true })
        return
      }

      const data = (await recommendationsRes.json()) as RecommendationsResponse
      const ids = new Set(storeFavorites)
      const recommendations = Array.isArray(data.recommendations) ? data.recommendations : []

      if (recommendations.length === 0) {
        setRecommendationState({
          badge: 'Fresh picks while we learn',
          note: 'We need a bit more activity before recommendations get specific, so this view is showing the newest listings for now.',
          tone: 'fallback',
        })
        await fetchAllItems({ skipLoading: true })
        return
      }

      setRecommendationState(buildRecommendationState(data))
      setProducts(recommendations.map((listing: any) => mapApiListingToProduct(listing, ids)))
    } catch {
      setRecommendationState({
        badge: 'Fresh picks for now',
        note: 'Something interrupted recommendations, so this view is falling back to the newest active listings.',
        tone: 'fallback',
      })
      await fetchAllItems({ skipLoading: true })
    } finally {
      setIsLoading(false)
    }
  }, [fetchAllItems, storeFavorites])

  const fetchTrending = useCallback(async () => {
    setIsLoading(true)
    try {
      const trendingRes = await fetch('/api/listings/trending?limit=16', { credentials: 'include' })
      const ids = new Set(storeFavorites)

      if (trendingRes.ok) {
        const data = await trendingRes.json()
        const listings = data.data?.listings || []
        setProducts(listings.map((listing: any) => mapApiListingToProduct(listing, ids)))
      } else {
        setProducts([])
      }
    } catch {
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }, [storeFavorites])

  const fetchNearby = useCallback(async () => {
    const loadNearby = async (latitude: number, longitude: number) => {
      try {
        const nearbyRes = await fetch(
          `/api/listings/nearby?lat=${latitude}&lon=${longitude}&radius=100&limit=16`,
          { credentials: 'include' }
        )
        const ids = new Set(storeFavorites)

        if (nearbyRes.ok) {
          const data = await nearbyRes.json()
          const listings = data.data?.listings || []
          setProducts(listings.map((listing: any) => mapApiListingToProduct(listing, ids)))
        } else {
          setProducts([])
        }
      } catch {
        setProducts([])
      } finally {
        setIsLoading(false)
      }
    }

    if (!userLocation) {
      if (!('geolocation' in navigator)) {
        setLocationPermission('denied')
        setFilter('all')
        await fetchAllItems({ skipLoading: true })
        return
      }

      setIsLoading(true)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setUserLocation({ lat: latitude, lon: longitude })
          setLocationPermission('granted')
          void loadNearby(latitude, longitude)
        },
        async () => {
          setLocationPermission('denied')
          setFilter('all')
          await fetchAllItems({ skipLoading: true })
        }
      )
      return
    }

    setIsLoading(true)
    await loadNearby(userLocation.lat, userLocation.lon)
  }, [fetchAllItems, storeFavorites, userLocation])

  useEffect(() => {
    const ids = new Set(storeFavorites)
    setProducts((prev) => prev.map((product) => ({ ...product, isFavorite: ids.has(product.id) })))
  }, [storeFavorites])

  useEffect(() => {
    setCurrentSlide(0)

    switch (filter) {
      case 'recommended':
        void fetchRecommendations()
        break
      case 'trending':
        void fetchTrending()
        break
      case 'nearby':
        void fetchNearby()
        break
      case 'all':
      default:
        void fetchAllItems()
        break
    }
  }, [filter, fetchAllItems, fetchNearby, fetchRecommendations, fetchTrending])

  const toggleFavorite = useCallback(
    (id: string) => {
      const product = products.find((item) => item.id === id)
      if (!product) return

      const nextFavorite = !product.isFavorite
      setProducts((prev) => prev.map((item) => (item.id === id ? { ...item, isFavorite: nextFavorite } : item)))

      if (nextFavorite) {
        addFavorite(id)
        fetch('/api/wishlist', {
          method: 'POST',
          headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
          credentials: 'include',
          body: JSON.stringify({ productId: id }),
        }).catch(() => {})
        return
      }

      removeFavorite(id)
      fetch('/api/wishlist', {
        method: 'DELETE',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ productId: id }),
      }).catch(() => {})
    },
    [addFavorite, products, removeFavorite]
  )

  const filters = useMemo(
    () => [
      {
        key: 'recommended',
        label: 'For You',
        icon: Sparkles,
        color: 'from-primary-500 to-primary-600',
        description:
          recommendationState.tone === 'signed-out'
            ? 'Sign in to personalize this feed'
            : recommendationState.tone === 'fallback'
              ? 'Fresh picks while we learn your taste'
              : 'Blended from your activity and saved interests',
      },
      {
        key: 'trending',
        label: 'Trending',
        icon: TrendingUp,
        color: 'from-accent-500 to-accent-600',
        description: 'What is hot across the marketplace',
      },
      {
        key: 'nearby',
        label: 'Nearby',
        icon: MapPin,
        color: 'from-secondary-500 to-secondary-600',
        description:
          locationPermission === 'denied' ? 'Location permission was denied' : 'Close to your location',
      },
      {
        key: 'all',
        label: 'All Items',
        icon: Search,
        color: 'from-gray-500 to-gray-600',
        description: 'Newest active listings across the marketplace',
      },
    ],
    [locationPermission, recommendationState.tone]
  )

  const displayProducts = products
  const totalSlides = Math.max(1, Math.ceil(displayProducts.length / slidesToShow))
  const startIndex = currentSlide * slidesToShow
  const carouselProducts = displayProducts.slice(startIndex, startIndex + slidesToShow)
  const canGoPrev = currentSlide > 0
  const canGoNext = currentSlide < totalSlides - 1

  useEffect(() => {
    if (currentSlide > totalSlides - 1) {
      setCurrentSlide(Math.max(totalSlides - 1, 0))
    }
  }, [currentSlide, totalSlides])

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => Math.min(prev + 1, totalSlides - 1))
  }, [totalSlides])

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => Math.max(prev - 1, 0))
  }, [])

  const handleCarouselKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'ArrowRight' && canGoNext) {
        event.preventDefault()
        nextSlide()
      }
      if (event.key === 'ArrowLeft' && canGoPrev) {
        event.preventDefault()
        prevSlide()
      }
    },
    [canGoNext, canGoPrev, nextSlide, prevSlide]
  )

  const handleTouchStart = useCallback((event: TouchEvent<HTMLDivElement>) => {
    touchEndXRef.current = null
    touchStartXRef.current = event.changedTouches[0]?.clientX ?? null
  }, [])

  const handleTouchEnd = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      touchEndXRef.current = event.changedTouches[0]?.clientX ?? null

      if (touchStartXRef.current === null || touchEndXRef.current === null) {
        return
      }

      const delta = touchStartXRef.current - touchEndXRef.current
      if (Math.abs(delta) < 40) return

      if (delta > 0 && canGoNext) {
        nextSlide()
      }
      if (delta < 0 && canGoPrev) {
        prevSlide()
      }
    },
    [canGoNext, canGoPrev, nextSlide, prevSlide]
  )

  const sectionDescription =
    filter === 'recommended'
      ? recommendationState.note
      : filter === 'trending'
        ? 'See the listings getting the most attention right now.'
        : filter === 'nearby'
          ? 'Use your location to surface listings closer to you.'
          : 'Browse the newest active listings across all categories.'

  const browseHref = filter === 'trending' ? '/browse?sortBy=newest' : '/browse'

  return (
    <section className="py-20 px-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ x: [0, 50, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-r from-primary-200/20 to-accent-200/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -50, 0], y: [0, 30, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
          className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-r from-accent-200/20 to-secondary-200/20 rounded-full blur-3xl"
        />
      </div>

      <div className="max-w-7xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center space-x-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white px-8 py-4 rounded-full text-sm font-medium mb-8 shadow-2xl"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-3 h-3 bg-white rounded-full"
            />
            <span>{filter === 'recommended' ? recommendationState.badge : 'Curated marketplace discovery'}</span>
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-3 h-3 bg-white rounded-full"
            />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-5xl lg:text-6xl font-bold mb-8"
          >
            <motion.span
              animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="gradient-primary bg-clip-text text-transparent bg-[length:200%_100%]"
            >
              Recommended
            </motion.span>
            <br />
            <span className="text-gray-900">for your next browse</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="text-xl text-gray-600 max-w-3xl mx-auto mb-4"
          >
            {sectionDescription}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.45 }}
            className="text-sm text-gray-500 max-w-2xl mx-auto mb-12"
          >
            {filter === 'recommended'
              ? 'This section adapts to the signals we actually have. When signals are weak, it falls back to fresh marketplace picks instead of pretending to be deeply personalized.'
              : `Showing ${displayProducts.length} items in this view right now.`}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12"
          >
            {filters.map(({ key, label, icon: Icon, color, description }, index) => (
              <motion.button
                key={key}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 + index * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilter(key as typeof filter)}
                className={`relative p-6 rounded-3xl font-semibold transition-all duration-300 text-left group ${
                  filter === key
                    ? `bg-gradient-to-br ${color} text-white shadow-2xl`
                    : 'bg-white/80 text-gray-700 hover:bg-white shadow-lg hover:shadow-xl'
                }`}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      filter === key ? 'bg-white/20' : 'bg-gray-100'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${filter === key ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <span className="text-lg">{label}</span>
                </div>
                <p className={`text-sm ${filter === key ? 'text-white/80' : 'text-gray-500'}`}>{description}</p>

                {filter === key && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center"
                  >
                    <div className="w-3 h-3 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full" />
                  </motion.div>
                )}
              </motion.button>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8 }}
            className="flex items-center justify-center space-x-4 mb-8"
          >
            <span className="text-sm text-gray-600 font-medium">View Mode:</span>
            <div className="flex bg-white/80 rounded-2xl p-1 shadow-lg">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode('carousel')}
                className={`px-6 py-3 rounded-xl text-sm font-medium transition-all flex items-center space-x-2 ${
                  viewMode === 'carousel'
                    ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Layout className="w-4 h-4" />
                <span>Carousel</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode('grid')}
                className={`px-6 py-3 rounded-xl text-sm font-medium transition-all flex items-center space-x-2 ${
                  viewMode === 'grid'
                    ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid className="w-4 h-4" />
                <span>Grid</span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>

        {isLoading && (
          <div className="flex justify-center items-center py-20">
            <div className="flex flex-col items-center space-y-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full"
              />
              <p className="text-gray-600 font-medium">
                {filter === 'nearby' && !userLocation
                  ? 'Requesting location access...'
                  : `Loading ${filter === 'recommended' ? 'recommended' : filter} items...`}
              </p>
            </div>
          </div>
        )}

        {!isLoading && displayProducts.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gradient-to-r from-primary-100 to-accent-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-12 h-12 text-primary-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No items found</h3>
              <p className="text-gray-600 mb-6">
                {filter === 'nearby'
                  ? 'No items showed up near your current area yet. You can keep browsing the full marketplace instead.'
                  : filter === 'recommended'
                    ? 'We do not have enough matching signals yet. Try saving a few favorites or browsing more listings first.'
                    : filter === 'trending'
                      ? 'Nothing is trending right now. Check back soon.'
                      : 'No items are available in this view right now.'}
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push('/browse')}
                className="px-8 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-semibold shadow-lg"
              >
                Browse All Items
              </motion.button>
            </div>
          </motion.div>
        )}

        {!isLoading && displayProducts.length > 0 && (
          <AnimatePresence mode="wait">
            {viewMode === 'carousel' ? (
              <motion.div
                key="carousel"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                {totalSlides > 1 && (
                  <motion.button
                    whileHover={canGoPrev ? { scale: 1.05 } : undefined}
                    whileTap={canGoPrev ? { scale: 0.95 } : undefined}
                    onClick={prevSlide}
                    disabled={!canGoPrev}
                    className="absolute left-2 lg:-left-16 top-1/3 -translate-y-1/2 z-10 w-10 h-10 lg:w-14 lg:h-14 bg-white shadow-xl rounded-xl lg:rounded-2xl flex items-center justify-center text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft className="w-5 h-5 lg:w-6 lg:h-6" />
                  </motion.button>
                )}

                {totalSlides > 1 && (
                  <motion.button
                    whileHover={canGoNext ? { scale: 1.05 } : undefined}
                    whileTap={canGoNext ? { scale: 0.95 } : undefined}
                    onClick={nextSlide}
                    disabled={!canGoNext}
                    className="absolute right-2 lg:-right-16 top-1/3 -translate-y-1/2 z-10 w-10 h-10 lg:w-14 lg:h-14 bg-white shadow-xl rounded-xl lg:rounded-2xl flex items-center justify-center text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Next slide"
                  >
                    <ChevronRight className="w-5 h-5 lg:w-6 lg:h-6" />
                  </motion.button>
                )}

                <div
                  className="overflow-hidden px-0 lg:px-0"
                  tabIndex={0}
                  onKeyDown={handleCarouselKeyDown}
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                  aria-label="Recommended listings carousel"
                >
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, x: 60 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -60 }}
                    transition={{ duration: 0.3 }}
                    className="flex space-x-4 pb-4 justify-center px-12 lg:px-0"
                  >
                    {carouselProducts.map((product, index) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, x: 40 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.08 }}
                        className="flex-shrink-0 w-full sm:w-1/2 lg:w-1/4"
                      >
                        <ProductCard product={product} index={index} onToggleFavorite={toggleFavorite} />
                      </motion.div>
                    ))}
                  </motion.div>
                </div>

                {totalSlides > 1 && (
                  <div className="flex justify-center mt-8 space-x-3">
                    {Array.from({ length: totalSlides }).map((_, dot) => (
                      <motion.button
                        key={dot}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setCurrentSlide(dot)}
                        aria-label={`Go to slide ${dot + 1}`}
                        className={`w-3 h-3 rounded-full transition-all ${
                          currentSlide === dot
                            ? 'bg-gradient-to-r from-primary-500 to-accent-500 shadow-lg'
                            : 'bg-primary-200 hover:bg-primary-300'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="grid"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.5 }}
                className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6"
              >
                {displayProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08 }}
                    className="relative group"
                  >
                    <ProductCard product={product} index={index} onToggleFavorite={toggleFavorite} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
          className="mt-20 text-center"
        >
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute inset-0 bg-gradient-to-r from-primary-500/30 via-accent-500/30 to-secondary-500/30 rounded-3xl blur-2xl"
            />

            <div className="relative bg-gradient-to-r from-transparent to-transparent backdrop-blur-sm rounded-3xl p-12">
              <motion.div
                initial={{ scale: 0.9 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.9 }}
                className="max-w-3xl mx-auto"
              >
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-16 h-16 bg-gradient-to-r from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center mx-auto mb-6"
                >
                  <Zap className="w-8 h-8 text-white" />
                </motion.div>

                <h3 className="text-3xl font-bold text-gray-900 mb-4">Want to keep exploring?</h3>
                <p className="text-gray-600 mb-10 text-lg">
                  Jump into the full browse experience for deeper filters, saved searches, and the complete live inventory.
                </p>

                <div className="flex flex-col sm:flex-row gap-6 justify-center">
                  <motion.button
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => router.push(browseHref)}
                    className="px-10 py-4 gradient-primary text-white rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-all text-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Search className="w-6 h-6" />
                      <span>Browse Full Inventory</span>
                    </div>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFilter('trending')}
                    className="px-10 py-4 border-2 border-primary-500 text-primary-600 rounded-2xl font-semibold hover:bg-primary-50 transition-all text-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <TrendingUp className="w-6 h-6" />
                      <span>Switch to Trending</span>
                    </div>
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
