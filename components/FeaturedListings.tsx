'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Star, TrendingUp, Award } from 'lucide-react'
import ProductCard from './ProductCard'
import { mapApiListingToProduct } from '@/lib/utils'
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
  postedAt: string
  isFavorite: boolean
  seller?: { name: string; rating?: number; totalSales?: number; verified?: boolean }
}

export default function FeaturedListings() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const storeFavorites = useAppStore((s) => s.favorites)
  const addFavorite = useAppStore((s) => s.addFavorite)
  const removeFavorite = useAppStore((s) => s.removeFavorite)
  const user = useAppStore((s) => s.user)

  const handleApplyNow = async () => {
    // Check if user is logged in
    if (!user) {
      toast.error('Please log in to apply for featured seller status')
      router.push('/login?redirect=/auth/upload-id')
      return
    }

    // Redirect to ID upload
    router.push('/auth/upload-id')
  }

  const handleLearnMore = () => {
    router.push('/seller-guidelines')
  }

  const fetchFeatured = useCallback(async () => {
    try {
      const params = new URLSearchParams({ sortBy: 'newest', limit: '8', page: '1' })
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
      const listings = data.data?.listings ?? data.listings
      if (data.success && Array.isArray(listings) && listings.length) {
        const activeListings = listings.filter((l: any) => l.status !== 'deleted')
        setProducts(activeListings.map((l: any) => mapApiListingToProduct(l, ids)))
      }
    } catch {
      setProducts([])
    }
  }, [storeFavorites])

  useEffect(() => {
    fetchFeatured()
  }, [fetchFeatured])

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

  return (
    <section className="py-20 px-4 relative overflow-visible">
      {/* Revolutionary Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-accent-50/40 via-transparent to-primary-50/40" />
        <motion.div
          animate={{ 
            x: [0, 50, 0],
            y: [0, -30, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-10 right-10 w-80 h-80 bg-gradient-to-r from-accent-200/40 to-primary-200/40 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ 
            x: [0, -50, 0],
            y: [0, 30, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 5
          }}
          className="absolute bottom-10 left-10 w-96 h-96 bg-gradient-to-r from-primary-200/40 to-secondary-200/40 rounded-full blur-3xl"
        />
      </div>

      <div className="max-w-7xl mx-auto relative">
        {/* Revolutionary Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center space-x-3 bg-gradient-to-r from-accent-500 to-primary-500 text-white px-8 py-4 rounded-full text-sm font-medium mb-8 shadow-2xl"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="w-3 h-3 bg-white rounded-full"
            />
            <span>Premium Featured Collection</span>
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="w-3 h-3 bg-white rounded-full"
            />
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="text-6xl lg:text-7xl font-bold mb-8"
          >
            <motion.span
              animate={{ 
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="gradient-accent bg-clip-text text-transparent bg-[length:200%_100%]"
            >
              Premium
            </motion.span>
            <br />
            <span className="text-gray-900">Featured Items</span>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="text-xl text-gray-600 max-w-3xl mx-auto mb-12"
          >
            Handpicked by our AI from verified sellers with 4.5+ ratings - the best of the best
          </motion.p>

          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
          >
            <div className="text-center p-6 bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl">
              <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Star className="w-6 h-6 text-white fill-white" />
              </div>
              <h3 className="text-2xl font-bold text-primary-600 mb-1">4.8+</h3>
              <p className="text-gray-600">Average Rating</p>
            </div>
            
            <div className="text-center p-6 bg-gradient-to-br from-accent-50 to-accent-100 rounded-2xl">
              <div className="w-12 h-12 bg-accent-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-accent-600 mb-1">100%</h3>
              <p className="text-gray-600">Verified Sellers</p>
            </div>
            
            <div className="text-center p-6 bg-gradient-to-br from-secondary-50 to-secondary-100 rounded-2xl">
              <div className="w-12 h-12 bg-secondary-500 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Award className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-secondary-600 mb-1">Premium</h3>
              <p className="text-gray-600">Quality Items</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Featured Products */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <div className="bg-gradient-to-r from-primary-500 via-primary-600 to-secondary-500 rounded-3xl p-8 text-white">
            <div className="max-w-2xl mx-auto">
              <h3 className="text-2xl font-bold mb-4">Want to become a featured seller?</h3>
              <p className="text-white/90 mb-6">
                Join our premium seller program and get your items featured to thousands of buyers
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={handleApplyNow}
                  className="px-8 py-3 bg-white text-primary-600 rounded-full font-semibold hover:shadow-lg transition-all"
                >
                  Apply Now
                </button>
                <button 
                  onClick={handleLearnMore}
                  className="px-8 py-3 border-2 border-white text-white rounded-full font-semibold hover:bg-white/10 transition-all"
                >
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}