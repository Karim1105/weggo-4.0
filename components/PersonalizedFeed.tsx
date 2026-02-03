'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, MapPin, Clock, TrendingUp, Search, Grid, Layout, Sparkles, Star, Zap } from 'lucide-react'
import ProductCard from './ProductCard'
import BrowseTransition from './BrowseTransition'
import { mapApiListingToProduct } from '@/lib/utils'
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
    verified: boolean
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
  const storeFavorites = useAppStore((s) => s.favorites)
  const addFavorite = useAppStore((s) => s.addFavorite)
  const removeFavorite = useAppStore((s) => s.removeFavorite)

  const fetchFeed = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ sortBy: 'newest', limit: '16', page: '1' })
      const [listingsRes, wishlistRes] = await Promise.all([
        fetch(`/api/listings?${params}`, { credentials: 'include' }),
        fetch('/api/wishlist', { credentials: 'include' }).catch(() => null),
      ])
      const ids = new Set<string>(storeFavorites)
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
  }, [storeFavorites])

  useEffect(() => {
    fetchFeed()
  }, [fetchFeed])

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
      fetch('/api/wishlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ productId: id }) }).catch(() => {})
    } else {
      setFavoriteIds((prev) => {
        const s = new Set(prev)
        s.delete(id)
        return s
      })
      removeFavorite(id)
      fetch('/api/wishlist', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ productId: id }) }).catch(() => {})
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

  const filteredProducts = products.filter(product => {
    if (filter === 'all') return true
    if (filter === 'recommended') return product.seller?.rating && product.seller.rating > 4.7
    if (filter === 'trending') return product.postedAt.includes('hour')
    if (filter === 'nearby') return product.location.includes('Cairo')
    return true
  })

  const slidesToShow = 4
  const totalSlides = Math.ceil(filteredProducts.length / slidesToShow)
  
  // Ensure we show exactly 4 items in carousel view
  const carouselProducts = filteredProducts.slice(0, 4)

  return (
    <section className="py-20 px-4 relative overflow-visible">
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
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12"
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

        {/* Revolutionary Product Display */}
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
               {/* Carousel Container - allow floating badges to overflow */}
               <div className="overflow-visible">
                 <div className="flex space-x-4 pb-4 overflow-x-auto overflow-y-visible scrollbar-hide justify-center">
                   {carouselProducts.map((product, index) => (
                     <motion.div
                       key={product.id}
                       initial={{ opacity: 0, x: 50 }}
                       whileInView={{ opacity: 1, x: 0 }}
                       viewport={{ once: true }}
                       transition={{ delay: index * 0.1 }}
                       className="flex-shrink-0 w-72"
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
               </div>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              {filteredProducts.map((product, index) => (
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