'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Star, TrendingUp, Award } from 'lucide-react'
import ProductCard from './ProductCard'
import { mapApiListingToProduct, withCsrfHeader } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { useUserVerification } from '@/lib/useUserVerification'

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
  seller?: { name: string; rating?: number; totalSales?: number; verified?: boolean }
}

export default function FeaturedListings() {
  const router = useRouter()
  const { user, handleVerificationFlow } = useUserVerification()
  const [products, setProducts] = useState<Product[]>([])
  const storeFavorites = useAppStore((s) => s.favorites)
  const addFavorite = useAppStore((s) => s.addFavorite)
  const removeFavorite = useAppStore((s) => s.removeFavorite)

  const syncProductFavorites = useCallback((items: Product[]) => {
    const favoriteIds = new Set(storeFavorites)
    return items.map((item) => ({ ...item, isFavorite: favoriteIds.has(item.id) }))
  }, [storeFavorites])

  const fetchFeatured = useCallback(async () => {
    try {
      const params = new URLSearchParams({ sortBy: 'newest', limit: '8', page: '1', includeTotal: 'false' })
      const listingsRes = await fetch(`/api/listings?${params}`, { credentials: 'include' })
      const data = await listingsRes.json()
      const listings = data.data?.listings ?? data.listings

      if (data.success && Array.isArray(listings) && listings.length) {
        const activeListings = listings.filter((listing: any) => listing.status !== 'deleted')
        setProducts(syncProductFavorites(activeListings.map((listing: any) => mapApiListingToProduct(listing, new Set()))))
      } else {
        setProducts([])
      }
    } catch {
      setProducts([])
    }
  }, [syncProductFavorites])

  useEffect(() => {
    void fetchFeatured()
  }, [fetchFeatured])

  useEffect(() => {
    setProducts((prev) => syncProductFavorites(prev))
  }, [syncProductFavorites])

  const toggleFavorite = (id: string) => {
    const product = products.find((item) => item.id === id)
    if (!product) return

    const next = !product.isFavorite
    setProducts((prev) => prev.map((item) => (item.id === id ? { ...item, isFavorite: next } : item)))

    if (next) {
      addFavorite(id)
      fetch('/api/wishlist', {
        method: 'POST',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ productId: id }),
      }).catch(() => {})
    } else {
      removeFavorite(id)
      fetch('/api/wishlist', {
        method: 'DELETE',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ productId: id }),
      }).catch(() => {})
    }
  }

  const visibleCount = products.length
  const categoryCount = useMemo(() => new Set(products.map((product) => product.category)).size, [products])
  const verifiedSellerCount = useMemo(
    () => products.filter((product) => product.seller?.verified).length,
    [products]
  )

  return (
    <section className="py-12 md:py-20 px-4 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-accent-50/40 via-transparent to-primary-50/40" />
        <motion.div
          animate={{ x: [0, 50, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-10 right-10 w-80 h-80 bg-gradient-to-r from-accent-200/40 to-primary-200/40 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -50, 0], y: [0, 30, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
          className="absolute bottom-10 left-10 w-96 h-96 bg-gradient-to-r from-primary-200/40 to-secondary-200/40 rounded-full blur-3xl"
        />
      </div>

      <div className="max-w-7xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 md:mb-20"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center space-x-2 md:space-x-3 bg-gradient-to-r from-accent-500 to-primary-500 text-white px-5 md:px-8 py-2 md:py-4 rounded-full text-xs md:text-sm font-medium mb-6 md:mb-8 shadow-2xl"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="w-3 h-3 bg-white rounded-full"
            />
            <span>Fresh Marketplace Picks</span>
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="w-3 h-3 bg-white rounded-full"
            />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-4 md:mb-8"
          >
            <motion.span
              animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="gradient-accent bg-clip-text text-transparent bg-[length:200%_100%]"
            >
              Fresh
            </motion.span>
            <br />
            <span className="text-gray-900">Listings To Explore</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="text-base md:text-xl text-gray-600 max-w-3xl mx-auto mb-8 md:mb-12"
          >
            A live snapshot of recently added items from across the marketplace, updated as new listings come in.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-16"
          >
            <div className="text-center p-4 md:p-6 bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-500 rounded-xl flex items-center justify-center mx-auto mb-2 md:mb-3">
                <Star className="w-5 h-5 md:w-6 md:h-6 text-white fill-white" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-primary-600 mb-1">{visibleCount}</h3>
              <p className="text-sm md:text-base text-gray-600">Listings Shown</p>
            </div>

            <div className="text-center p-4 md:p-6 bg-gradient-to-br from-accent-50 to-accent-100 rounded-2xl">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-accent-500 rounded-xl flex items-center justify-center mx-auto mb-2 md:mb-3">
                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-accent-600 mb-1">{categoryCount}</h3>
              <p className="text-sm md:text-base text-gray-600">Categories Covered</p>
            </div>

            <div className="text-center p-4 md:p-6 bg-gradient-to-br from-secondary-50 to-secondary-100 rounded-2xl">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-secondary-500 rounded-xl flex items-center justify-center mx-auto mb-2 md:mb-3">
                <Award className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-secondary-600 mb-1">{verifiedSellerCount}</h3>
              <p className="text-sm md:text-base text-gray-600">Verified Sellers In View</p>
            </div>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product, index) => (
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
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="bg-gradient-to-r from-primary-500 via-primary-600 to-secondary-500 rounded-3xl p-8 text-white">
            <div className="max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold mb-4">Ready to list something of your own?</h3>
              <p className="text-white/90 mb-6">
                Start selling on Weggo and get your items in front of buyers across the marketplace.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => handleVerificationFlow('/sell')}
                  className="px-8 py-3 bg-white text-primary-600 rounded-full font-semibold hover:shadow-lg transition-all"
                >
                  {user?.sellerVerified ? 'Start Selling' : 'Become A Seller'}
                </button>
                <button
                  onClick={() => router.push('/browse')}
                  className="px-8 py-3 border-2 border-white text-white rounded-full font-semibold hover:bg-white/10 transition-all"
                >
                  Browse More
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
