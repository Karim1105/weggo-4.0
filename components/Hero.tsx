'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Sparkles, TrendingUp, Shield, Heart, MapPin, Star } from 'lucide-react'
import Link from 'next/link'
import { listingImageUrl } from '@/lib/utils'
import { useUserVerification } from '@/lib/useUserVerification'

interface FeaturedProduct {
  id: string
  title: string
  price: number
  location: string
  condition: string
  image: string
  category: string
  seller: {
    name: string
    rating?: number
    verified?: boolean
  }
}

const FALLBACK_PRODUCTS: FeaturedProduct[] = [
  { id: '1', title: 'iPhone 13 Pro Max 256GB', price: 15000, location: 'Cairo', condition: 'Like New', image: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=400&h=400&fit=crop&crop=center', category: 'Electronics', seller: { name: 'Seller', rating: 4.8, verified: true } },
  { id: '2', title: 'MacBook Pro M2 16"', price: 42000, location: 'Giza', condition: 'Excellent', image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=400&fit=crop&crop=center', category: 'Electronics', seller: { name: 'Seller', rating: 4.9, verified: true } },
  { id: '3', title: 'Sony PlayStation 5', price: 9500, location: 'Cairo', condition: 'Like New', image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400&h=400&fit=crop&crop=center', category: 'Gaming', seller: { name: 'Seller', rating: 4.7, verified: true } },
]

export default function Hero() {
  const { handleVerificationFlow } = useUserVerification()
  const [featuredProducts, setFeaturedProducts] = useState<FeaturedProduct[]>(FALLBACK_PRODUCTS)
  const [favorites, setFavorites] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/listings?limit=8&sortBy=newest', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        const listings = data.data?.listings ?? data.listings
        if (data.success && Array.isArray(listings) && listings.length) {
          const activeListing = listings.filter((p: any) => p.status !== 'deleted')
          const mapped = activeListing.slice(0, 3).map((p: any) => ({
            id: p._id,
            title: p.title,
            price: p.price,
            location: p.location,
            condition: p.condition,
            image: listingImageUrl(p.images?.[0]),
            category: p.category,
            seller: { name: p.seller?.name || 'Seller', rating: 4.5, verified: p.seller?.isVerified },
          }))
          setFeaturedProducts(mapped)
        }
      })
      .catch(() => {})
  }, [])

  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    )
  }

  return (
    <section className="relative pt-24 md:pt-36 pb-12 md:pb-20 px-4 overflow-visible">
      {/* Warm Intense Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-100/60 via-orange-100/50 to-red-100/40" />
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-yellow-100/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-bl from-orange-50/30 via-transparent to-amber-50/30" />
      
      <div className="max-w-7xl mx-auto relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6 md:space-y-12"
          >
            <div className="space-y-4 md:space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center space-x-2 md:space-x-3 bg-gradient-to-r from-primary-500/10 to-accent-500/10 backdrop-blur-sm border border-primary-200/30 text-primary-700 px-4 md:px-6 py-2 md:py-3 rounded-full text-xs md:text-sm font-semibold shadow-lg"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-4 h-4" />
                </motion.div>
                <span>AI-Powered Marketplace</span>
              </motion.div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black leading-tight md:leading-[0.9] tracking-tight">
                <span className="block text-gray-900">Your Way to Go</span>
                <span className="block">
                  <span className="gradient-primary bg-clip-text text-transparent">
                    Second Hand
                  </span>
                </span>
              </h1>

              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed max-w-2xl">
                <span className="text-primary-600 font-semibold">اشتري وبيع بسهولة</span> - 
                Your AI assistant helps you find perfect deals and price items intelligently
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-6">
              <Link href="/browse" className="w-full sm:w-auto">
                <motion.span
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="group relative overflow-hidden flex items-center justify-center bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 text-white px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 rounded-2xl font-bold text-base md:text-lg shadow-2xl hover:shadow-3xl transition-all duration-300 border-2 border-blue-500/20 cursor-pointer w-full"
                >
                  <span className="relative z-10 flex items-center space-x-3">
                    <Search className="w-5 h-5" />
                    <span>Start Exploring</span>
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </motion.span>
              </Link>

              <motion.button
                onClick={() => handleVerificationFlow('/sell')}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="group relative overflow-hidden flex items-center justify-center border-2 border-blue-500 text-blue-600 px-6 sm:px-8 md:px-10 py-3 sm:py-4 md:py-5 rounded-2xl font-bold text-base md:text-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 transition-all duration-300 shadow-lg hover:shadow-xl bg-white/80 backdrop-blur-sm cursor-pointer w-full"
              >
                <span className="relative z-10 flex items-center space-x-3">
                  <Sparkles className="w-5 h-5" />
                  <span>Sell Now</span>
                </span>
              </motion.button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 pt-8 md:pt-16">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="group text-center space-y-4"
              >
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="w-16 h-16 mx-auto bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300"
                >
                  <Sparkles className="w-8 h-8 text-white" />
                </motion.div>
                <div className="space-y-2">
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">AI Assistant</h3>
                  <p className="text-sm md:text-base text-gray-600 leading-relaxed">Smart recommendations tailored to your preferences</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="group text-center space-y-4"
              >
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="w-16 h-16 mx-auto bg-gradient-to-br from-accent-500 to-accent-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300"
                >
                  <TrendingUp className="w-8 h-8 text-white" />
                </motion.div>
                <div className="space-y-2">
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 group-hover:text-accent-600 transition-colors">Smart Pricing</h3>
                  <p className="text-sm md:text-base text-gray-600 leading-relaxed">AI-powered pricing suggestions for optimal deals</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="group text-center space-y-4"
              >
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="w-16 h-16 mx-auto bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300"
                >
                  <Shield className="w-8 h-8 text-white" />
                </motion.div>
                <div className="space-y-2">
                  <h3 className="text-lg md:text-xl font-bold text-gray-900 group-hover:text-secondary-600 transition-colors">Safe & Secure</h3>
                  <p className="text-sm md:text-base text-gray-600 leading-relaxed">Protected transactions with verified sellers</p>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Right Content - Animated Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            {/* Floating Cards - Properly Positioned */}
            <div className="relative w-full h-[700px]">
              {/* Card 1 - Top Right */}
              {featuredProducts[0] && (
                <motion.div
                  animate={{
                    y: [0, -15, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute top-0 right-0 w-72 bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-2xl hover:shadow-3xl cursor-pointer group border border-white/20 hover:border-primary-200/50 transition-all duration-500"
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link href={`/listings/${featuredProducts[0].id}`}>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleFavorite(featuredProducts[0].id)
                        }}
                        className="absolute top-2 right-2 z-10 p-2 bg-white/80 rounded-full shadow-lg hover:bg-white transition-colors"
                      >
                        <Heart 
                          className={`w-4 h-4 ${
                            favorites.includes(featuredProducts[0].id) 
                              ? 'text-red-500 fill-current' 
                              : 'text-gray-400'
                          }`} 
                        />
                      </button>
                      <div className="aspect-square rounded-xl mb-4 overflow-hidden">
                        <img 
                          src={featuredProducts[0].image}
                          alt={featuredProducts[0].title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <div className="space-y-3">
                        <h3 className="font-semibold text-base mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">
                          {featuredProducts[0].title}
                        </h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <MapPin className="w-3 h-3" />
                          <span>{featuredProducts[0].location}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                            {featuredProducts[0].condition}
                          </span>
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span className="text-xs text-gray-600">{featuredProducts[0].seller.rating}</span>
                            {featuredProducts[0].seller.verified && (
                              <span className="text-xs text-green-600">✓</span>
                            )}
                          </div>
                        </div>
                        <p className="text-xl font-bold text-primary-600 group-hover:text-primary-700 transition-colors">
                          {featuredProducts[0].price.toLocaleString()} EGP
                        </p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )}

              {/* Card 2 - Bottom Left */}
              {featuredProducts[1] && (
                <motion.div
                  animate={{
                    y: [0, 15, 0],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                  }}
                  className="absolute bottom-32 left-0 w-72 bg-white/95 backdrop-blur-sm rounded-3xl p-6 shadow-2xl hover:shadow-3xl cursor-pointer group border border-white/20 hover:border-accent-200/50 transition-all duration-500"
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link href={`/listings/${featuredProducts[1].id}`}>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleFavorite(featuredProducts[1].id)
                        }}
                        className="absolute top-2 right-2 z-10 p-2 bg-white/80 rounded-full shadow-lg hover:bg-white transition-colors"
                      >
                        <Heart 
                          className={`w-4 h-4 ${
                            favorites.includes(featuredProducts[1].id) 
                              ? 'text-red-500 fill-current' 
                              : 'text-gray-400'
                          }`} 
                        />
                      </button>
                      <div className="aspect-square rounded-xl mb-4 overflow-hidden">
                        <img 
                          src={featuredProducts[1].image}
                          alt={featuredProducts[1].title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <div className="space-y-3">
                        <h3 className="font-semibold text-base mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">
                          {featuredProducts[1].title}
                        </h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <MapPin className="w-3 h-3" />
                          <span>{featuredProducts[1].location}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                            {featuredProducts[1].condition}
                          </span>
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span className="text-xs text-gray-600">{featuredProducts[1].seller.rating}</span>
                            {featuredProducts[1].seller.verified && (
                              <span className="text-xs text-green-600">✓</span>
                            )}
                          </div>
                        </div>
                        <p className="text-xl font-bold text-primary-600 group-hover:text-primary-700 transition-colors">
                          {featuredProducts[1].price.toLocaleString()} EGP
                        </p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )}

              {/* Card 3 - Middle Left */}
              {featuredProducts[2] && (
                <motion.div
                  animate={{
                    y: [0, -10, 0],
                  }}
                  transition={{
                    duration: 3.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5
                  }}
                  className="absolute top-1/3 left-1/3 w-64 bg-white/95 backdrop-blur-sm rounded-3xl p-5 shadow-2xl hover:shadow-3xl cursor-pointer group border border-white/20 hover:border-secondary-200/50 transition-all duration-500"
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link href={`/listings/${featuredProducts[2].id}`}>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggleFavorite(featuredProducts[2].id)
                        }}
                        className="absolute top-2 right-2 z-10 p-2 bg-white/80 rounded-full shadow-lg hover:bg-white transition-colors"
                      >
                        <Heart 
                          className={`w-4 h-4 ${
                            favorites.includes(featuredProducts[2].id) 
                              ? 'text-red-500 fill-current' 
                              : 'text-gray-400'
                          }`} 
                        />
                      </button>
                      <div className="aspect-video rounded-lg mb-3 overflow-hidden">
                        <img 
                          src={featuredProducts[2].image}
                          alt={featuredProducts[2].title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold text-sm mb-1 group-hover:text-primary-600 transition-colors line-clamp-2">
                          {featuredProducts[2].title}
                        </h3>
                        <div className="flex items-center space-x-2 text-xs text-gray-600">
                          <MapPin className="w-3 h-3" />
                          <span>{featuredProducts[2].location}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                            {featuredProducts[2].condition}
                          </span>
                          <div className="flex items-center space-x-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span className="text-xs text-gray-600">{featuredProducts[2].seller.rating}</span>
                            {featuredProducts[2].seller.verified && (
                              <span className="text-xs text-green-600">✓</span>
                            )}
                          </div>
                        </div>
                        <p className="text-lg font-bold text-primary-600 group-hover:text-primary-700 transition-colors">
                          {featuredProducts[2].price.toLocaleString()} EGP
                        </p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Warm Decorative Elements */}
      <div className="absolute top-20 right-10 w-20 h-20 bg-amber-200/40 rounded-full blur-2xl animate-pulse" />
      <div className="absolute bottom-20 left-10 w-32 h-32 bg-orange-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-yellow-200/30 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2s' }} />
    </section>
  )
}

