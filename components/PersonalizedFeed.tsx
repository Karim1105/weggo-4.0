'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, MapPin, Clock, TrendingUp, Search, Grid, Layout, Sparkles, Star, Zap, ChevronLeft, ChevronRight } from 'lucide-react'
import ProductCard from './ProductCard'
import BrowseTransition from './BrowseTransition'
import { mapApiListingToProduct, withCsrfHeader } from '@/lib/utils'
import { useAppStore } from '@/lib/store'

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
    name: string
    rating?: number
    totalSales?: number
    verified?: boolean
  }
}

export default function PersonalizedFeed() {
  const [products, setProducts] = useState<Product[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | 'recommended' | 'nearby' | 'trending'>('recommended')
  const [showBrowse, setShowBrowse] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'carousel'>('carousel')
  const [currentSlide, setCurrentSlide] = useState(0)
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt')
  const [slidesToShow, setSlidesToShow] = useState(4)
  const storeFavorites = useAppStore((s) => s.favorites)
  const addFavorite = useAppStore((s) => s.addFavorite)
  const removeFavorite = useAppStore((s) => s.removeFavorite)

  // Handle responsive slides
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setSlidesToShow(1) // Mobile: 1 item
      } else if (window.innerWidth < 1024) {
        setSlidesToShow(2) // Tablet: 2 items
      } else {
        setSlidesToShow(4) // Desktop: 4 items
      }
      setCurrentSlide(0) // Reset to first slide on resize
    }

    handleResize() // Set initial value
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Fetch all items
  const fetchAllItems = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ sortBy: 'newest', limit: '16', page: '1' })
      const [listingsRes, wishlistRes] = await Promise.all([
        fetch(`/api/listings?${params}`, { credentials: 'include' }),
        fetch('/api/wishlist', { credentials: 'include' }).catch(() => null),
      ])
      const ids = new Set<string>()
      const listingsData = await listingsRes.json()
      const rawListings = listingsData.data?.listings ?? listingsData.listings
      let listings: any[] = listingsData.success && Array.isArray(rawListings) ? rawListings : []
      if (wishlistRes?.ok) {
        const wData = await wishlistRes.json()
        if (wData?.success && Array.isArray(wData.wishlist)) {
          wData.wishlist.forEach((p: { _id: string }) => ids.add(p._id))
        }
      }
      setFavoriteIds(ids)
      setProducts(listings.map((l: any) => mapApiListingToProduct(l, ids)))
    } catch {
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch personalized recommendations
  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true)
    try {
      const [recommendationsRes, wishlistRes] = await Promise.all([
        fetch('/api/recommendations', { credentials: 'include' }),
        fetch('/api/wishlist', { credentials: 'include' }).catch(() => null),
      ])
      
      const ids = new Set<string>()
      if (wishlistRes?.ok) {
        const wData = await wishlistRes.json()
        if (wData?.success && Array.isArray(wData.wishlist)) {
          wData.wishlist.forEach((p: { _id: string }) => ids.add(p._id))
        }
      }
      
      if (recommendationsRes.ok) {
        const data = await recommendationsRes.json()
        const recommendations = data.recommendations || []
        setFavoriteIds(ids)
        setProducts(recommendations.map((l: any) => mapApiListingToProduct(l, ids)))
      } else {
        // If not authenticated or no recommendations, fallback to all items
        fetchAllItems()
      }
    } catch {
      // Fallback to all items on error
      fetchAllItems()
    } finally {
      setIsLoading(false)
    }
  }, [fetchAllItems])

  // Fetch trending items
  const fetchTrending = useCallback(async () => {
    setIsLoading(true)
    try {
      const [trendingRes, wishlistRes] = await Promise.all([
        fetch('/api/listings/trending?limit=16', { credentials: 'include' }),
        fetch('/api/wishlist', { credentials: 'include' }).catch(() => null),
      ])
      
      const ids = new Set<string>()
      if (wishlistRes?.ok) {
        const wData = await wishlistRes.json()
        if (wData?.success && Array.isArray(wData.wishlist)) {
          wData.wishlist.forEach((p: { _id: string }) => ids.add(p._id))
        }
      }
      
      if (trendingRes.ok) {
        const data = await trendingRes.json()
        const listings = data.data?.listings || []
        setFavoriteIds(ids)
        setProducts(listings.map((l: any) => mapApiListingToProduct(l, ids)))
      } else {
        setProducts([])
      }
    } catch {
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch nearby items with location
  const fetchNearby = useCallback(async () => {
    if (!userLocation) {
      // Request location permission first
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            setIsLoading(true)
            const { latitude, longitude } = position.coords
            setUserLocation({ lat: latitude, lon: longitude })
            setLocationPermission('granted')
            
            try {
              const [nearbyRes, wishlistRes] = await Promise.all([
                fetch(`/api/listings/nearby?lat=${latitude}&lon=${longitude}&radius=100&limit=16`, { credentials: 'include' }),
                fetch('/api/wishlist', { credentials: 'include' }).catch(() => null),
              ])
              
              const ids = new Set<string>()
              if (wishlistRes?.ok) {
                const wData = await wishlistRes.json()
                if (wData?.success && Array.isArray(wData.wishlist)) {
                  wData.wishlist.forEach((p: { _id: string }) => ids.add(p._id))
                }
              }
              
              if (nearbyRes.ok) {
                const data = await nearbyRes.json()
                const listings = data.data?.listings || []
                setFavoriteIds(ids)
                setProducts(listings.map((l: any) => mapApiListingToProduct(l, ids)))
              } else {
                setProducts([])
              }
            } catch {
              setProducts([])
            } finally {
              setIsLoading(false)
            }
          },
          (error) => {
            console.error('Location permission denied:', error)
            setLocationPermission('denied')
            setIsLoading(false)
            // Fallback to all items
            alert('Location access denied. Showing all items instead.')
            setFilter('all')
            fetchAllItems()
          }
        )
      } else {
        alert('Geolocation is not supported by your browser.')
        setFilter('all')
        fetchAllItems()
      }
    } else {
      // Already have location, fetch nearby
      setIsLoading(true)
      try {
        const [nearbyRes, wishlistRes] = await Promise.all([
          fetch(`/api/listings/nearby?lat=${userLocation.lat}&lon=${userLocation.lon}&radius=100&limit=16`, { credentials: 'include' }),
          fetch('/api/wishlist', { credentials: 'include' }).catch(() => null),
        ])
        
        const ids = new Set<string>()
        if (wishlistRes?.ok) {
          const wData = await wishlistRes.json()
          if (wData?.success && Array.isArray(wData.wishlist)) {
            wData.wishlist.forEach((p: { _id: string }) => ids.add(p._id))
          }
        }
        
        if (nearbyRes.ok) {
          const data = await nearbyRes.json()
          const listings = data.data?.listings || []
          setFavoriteIds(ids)
          setProducts(listings.map((l: any) => mapApiListingToProduct(l, ids)))
        } else {
          setProducts([])
        }
      } catch {
        setProducts([])
      } finally {
        setIsLoading(false)
      }
    }
  }, [userLocation, fetchAllItems])

  // Fetch feed when filter changes
  useEffect(() => {
    setCurrentSlide(0) // Reset to first slide when changing filters
    switch (filter) {
      case 'recommended':
        fetchRecommendations()
        break
      case 'trending':
        fetchTrending()
        break
      case 'nearby':
        fetchNearby()
        break
      case 'all':
      default:
        fetchAllItems()
        break
    }
  }, [filter, fetchAllItems, fetchNearby, fetchRecommendations, fetchTrending])

  const toggleFavorite = (id: string) => {
    const product = products.find((p) => p.id === id)
    if (!product) return
    const next = !product.isFavorite
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isFavorite: next } : p))
    )
    if (next) {
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
        const s = new Set(prev)
        s.delete(id)
        return s
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

  const filters = [
    { 
      key: 'recommended', 
      label: 'For You', 
      icon: Sparkles, 
      color: 'from-primary-500 to-primary-600',
      description: 'AI-curated just for you'
    },
    { 
      key: 'trending', 
      label: 'Trending', 
      icon: TrendingUp, 
      color: 'from-accent-500 to-accent-600',
      description: 'What\'s hot right now'
    },
    { 
      key: 'nearby', 
      label: 'Nearby', 
      icon: MapPin, 
      color: 'from-secondary-500 to-secondary-600',
      description: 'Close to your location'
    },
    { 
      key: 'all', 
      label: 'All Items', 
      icon: Search, 
      color: 'from-gray-500 to-gray-600',
      description: 'Browse everything'
    }
  ]

  // Use products directly - no client-side filtering needed
  const displayProducts = products

  const totalSlides = Math.ceil(displayProducts.length / slidesToShow)
  
  // Get current slide products
  const startIndex = currentSlide * slidesToShow
  const carouselProducts = displayProducts.slice(startIndex, startIndex + slidesToShow)

  // Navigation handlers
  const nextSlide = () => {
    const newTotalSlides = Math.ceil(displayProducts.length / slidesToShow)
    setCurrentSlide((prev) => (prev + 1) % newTotalSlides)
  }

  const prevSlide = () => {
    const newTotalSlides = Math.ceil(displayProducts.length / slidesToShow)
    setCurrentSlide((prev) => (prev - 1 + newTotalSlides) % newTotalSlides)
  }

  return (
    <section className="py-20 px-4 relative overflow-hidden">
      {/* Subtle floating elements only */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ 
            x: [0, 50, 0],
            y: [0, -30, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-r from-primary-200/20 to-accent-200/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ 
            x: [0, -50, 0],
            y: [0, 30, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 5
          }}
          className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-r from-accent-200/20 to-secondary-200/20 rounded-full blur-3xl"
        />
      </div>

      <div className="max-w-7xl mx-auto relative">
        {/* Revolutionary Header */}
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
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-3 h-3 bg-white rounded-full"
            />
            <span>AI-Powered Recommendations</span>
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
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
               animate={{ 
                 backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
               }}
               transition={{ 
                 duration: 3,
                 repeat: Infinity,
                 ease: "easeInOut"
               }}
               className="gradient-primary bg-clip-text text-transparent bg-[length:200%_100%]"
             >
               Personalized
             </motion.span>
             <br />
             <span className="text-gray-900">Just for You</span>
           </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="text-xl text-gray-600 max-w-3xl mx-auto mb-12"
          >
            Discover items tailored to your taste using our advanced AI algorithm that learns from your preferences
          </motion.p>

          {/* Revolutionary Filter System */}
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
                onClick={() => setFilter(key as any)}
                className={`relative p-6 rounded-3xl font-semibold transition-all duration-300 text-left group ${
                  filter === key
                    ? `bg-gradient-to-br ${color} text-white shadow-2xl`
                    : 'bg-white/80 text-gray-700 hover:bg-white shadow-lg hover:shadow-xl'
                }`}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    filter === key ? 'bg-white/20' : 'bg-gray-100'
                  }`}>
                    <Icon className={`w-5 h-5 ${filter === key ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <span className="text-lg">{label}</span>
                </div>
                <p className={`text-sm ${filter === key ? 'text-white/80' : 'text-gray-500'}`}>
                  {description}
                </p>
                
                {/* Active indicator */}
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

          {/* View Mode Toggle */}
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
                  viewMode === 'carousel' ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-md' : 'text-gray-600 hover:text-gray-900'
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
                  viewMode === 'grid' ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white shadow-md' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Grid className="w-4 h-4" />
                <span>Grid</span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-20">
            <div className="flex flex-col items-center space-y-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full"
              />
              <p className="text-gray-600 font-medium">
                {filter === 'nearby' && !userLocation 
                  ? 'Requesting location access...' 
                  : `Loading ${filter === 'recommended' ? 'personalized' : filter} items...`}
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
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
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                No items found
              </h3>
              <p className="text-gray-600 mb-6">
                {filter === 'nearby' 
                  ? 'No items found near your location. Try increasing the search radius or browse all items.'
                  : filter === 'recommended'
                  ? 'Start browsing items to get personalized recommendations!'
                  : filter === 'trending'
                  ? 'No trending items at the moment. Check back soon!'
                  : 'No items available right now.'}
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFilter('all')}
                className="px-8 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl font-semibold shadow-lg"
              >
                Browse All Items
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Revolutionary Product Display */}
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
               {/* Left Arrow */}
               {totalSlides > 1 && (
                 <motion.button
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   onClick={prevSlide}
                   className="absolute left-2 lg:-left-16 top-1/3 -translate-y-1/2 z-10 w-10 h-10 lg:w-14 lg:h-14 bg-white shadow-xl rounded-xl lg:rounded-2xl flex items-center justify-center text-primary-600 hover:bg-primary-50 transition-colors"
                   aria-label="Previous slide"
                 >
                   <ChevronLeft className="w-5 h-5 lg:w-6 lg:h-6" />
                 </motion.button>
               )}

               {/* Right Arrow */}
               {totalSlides > 1 && (
                 <motion.button
                   whileHover={{ scale: 1.05 }}
                   whileTap={{ scale: 0.95 }}
                   onClick={nextSlide}
                   className="absolute right-2 lg:-right-16 top-1/3 -translate-y-1/2 z-10 w-10 h-10 lg:w-14 lg:h-14 bg-white shadow-xl rounded-xl lg:rounded-2xl flex items-center justify-center text-primary-600 hover:bg-primary-50 transition-colors"
                   aria-label="Next slide"
                 >
                   <ChevronRight className="w-5 h-5 lg:w-6 lg:h-6" />
                 </motion.button>
               )}

               {/* Carousel Container - allow floating badges to overflow */}
               <div className="overflow-hidden px-0 lg:px-0">
                 <motion.div
                   key={currentSlide}
                   initial={{ opacity: 0, x: 100 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -100 }}
                   transition={{ duration: 0.3 }}
                   className="flex space-x-4 pb-4 justify-center px-12 lg:px-0"
                 >
                   {carouselProducts.map((product, index) => (
                     <motion.div
                       key={product.id}
                       initial={{ opacity: 0, x: 50 }}
                       whileInView={{ opacity: 1, x: 0 }}
                       viewport={{ once: true }}
                       transition={{ delay: index * 0.1 }}
                       className="flex-shrink-0 w-full sm:w-1/2 lg:w-1/4"
                     >
                       <div className="relative group">
                         <ProductCard
                           product={product}
                           index={index}
                           onToggleFavorite={toggleFavorite}
                         />
                       </div>
                     </motion.div>
                   ))}
                 </motion.div>
               </div>
                 
               {/* Carousel Navigation */}
               <div className="flex justify-center mt-8 space-x-3">
                   {Array.from({ length: totalSlides }).map((_, dot) => (
                     <motion.button
                       key={dot}
                       whileHover={{ scale: 1.2 }}
                       whileTap={{ scale: 0.9 }}
                       onClick={() => setCurrentSlide(dot)}
                       className={`w-3 h-3 rounded-full transition-all ${
                         currentSlide === dot 
                           ? 'bg-gradient-to-r from-primary-500 to-accent-500 shadow-lg' 
                           : 'bg-primary-200 hover:bg-primary-300'
                       }`}
                     />
                   ))}
                 </div>
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
                  transition={{ delay: index * 0.1 }}
                  className="relative group"
                >
                  <ProductCard
                    product={product}
                    index={index}
                    onToggleFavorite={toggleFavorite}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        )}

        {/* Revolutionary CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
          className="mt-20 text-center"
        >
          <div className="relative">
            {/* Background Glow */}
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.3, 0.5, 0.3]
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
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
                
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Want to see more amazing items?
                </h3>
                <p className="text-gray-600 mb-10 text-lg">
                  Explore our full collection with advanced filters, AI-powered search, and personalized recommendations
                </p>
                
                <div className="flex flex-col sm:flex-row gap-6 justify-center">
                  <motion.button
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowBrowse(true)}
                    className="px-10 py-4 gradient-primary text-white rounded-2xl font-semibold shadow-xl hover:shadow-2xl transition-all text-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <Search className="w-6 h-6" />
                      <span>Browse All Items</span>
                    </div>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05, y: -3 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-10 py-4 border-2 border-primary-500 text-primary-600 rounded-2xl font-semibold hover:bg-primary-50 transition-all text-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <TrendingUp className="w-6 h-6" />
                      <span>View Trending</span>
                    </div>
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Browse Transition Modal */}
        <BrowseTransition
          isActive={showBrowse}
          onClose={() => setShowBrowse(false)}
          products={products}
          onToggleFavorite={toggleFavorite}
        />
      </div>
    </section>
  )
}
