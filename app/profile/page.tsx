'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { User, MapPin, Star, Package, Heart, Settings, LogOut, ShieldCheck, FileUp } from 'lucide-react'
import { mapApiListingToProduct, withCsrfHeader } from '@/lib/utils'
import ProductCard from '@/components/ProductCard'
import { useAppStore } from '@/lib/store'

interface UserData {
  id: string
  name: string
  email: string
  location?: string
  avatar?: string
  role?: string
  sellerVerified?: boolean
}

interface Listing {
  _id: string
  title: string
  price: number
  location: string
  condition: string
  category: string
  images?: string[]
  views: number
  createdAt: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [wishlistCount, setWishlistCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [uploadingId, setUploadingId] = useState(false)
  const [idFile, setIdFile] = useState<File | null>(null)
  const [savedSearches, setSavedSearches] = useState<any[]>([])
  const addFavorite = useAppStore((s) => s.addFavorite)
  const removeFavorite = useAppStore((s) => s.removeFavorite)
  const favorites = useAppStore((s) => s.favorites)

  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, listingsRes, wishlistRes, savedRes] = await Promise.all([
          fetch('/api/auth/me', { credentials: 'include' }),
          fetch('/api/listings?seller=me&limit=50', { credentials: 'include' }),
          fetch('/api/wishlist', { credentials: 'include' }).catch(() => null),
          fetch('/api/saved-searches', { credentials: 'include' }).catch(() => null),
        ])
        if (meRes.status === 401) {
          router.replace('/login?redirect=/profile')
          return
        }
        const meData = await meRes.json()
        if (meData.success && meData.user) {
          setUser(meData.user)
        } else {
          router.replace('/login?redirect=/profile')
          return
        }
        const listData = await listingsRes.json()
        const listings = listData.data?.listings ?? listData.listings
        if (listData.success && Array.isArray(listings)) {
          setListings(listings)
        }
        if (wishlistRes?.ok) {
          const wData = await wishlistRes.json()
          if (wData?.success && Array.isArray(wData.wishlist)) {
            setWishlistCount(wData.wishlist.length)
          }
        }
        if (savedRes?.ok) {
          const sData = await savedRes.json()
          if (sData?.success && Array.isArray(sData.searches)) {
            setSavedSearches(sData.searches)
          }
        }
      } catch {
        router.replace('/login?redirect=/profile')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const deleteSavedSearch = async (id: string) => {
    await fetch(`/api/saved-searches?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: withCsrfHeader({}), credentials: 'include' }).catch(() => null)
    setSavedSearches((prev) => prev.filter((s) => s._id !== id))
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', headers: withCsrfHeader({}), credentials: 'include' })
    setUser(null)
    router.push('/')
    router.refresh()
  }

  const handleUploadId = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!idFile) return
    setUploadingId(true)
    try {
      const formData = new FormData()
      formData.append('idDocument', idFile)
      const res = await fetch('/api/auth/upload-id', { method: 'POST', headers: withCsrfHeader({}), credentials: 'include', body: formData })
      const data = await res.json()
      if (data.success) {
        setUser((prev) => (prev ? { ...prev, sellerVerified: true } : null))
        setIdFile(null)
      }
    } finally {
      setUploadingId(false)
    }
  }

  const toggleFavorite = (id: string) => {
    const product = listings.find((p) => p._id === id)
    if (!product) return
    if (favorites.includes(id)) {
      removeFavorite(id)
      fetch('/api/wishlist', { method: 'DELETE', headers: withCsrfHeader({ 'Content-Type': 'application/json' }), credentials: 'include', body: JSON.stringify({ productId: id }) }).catch(() => {})
      setWishlistCount((c) => Math.max(0, c - 1))
    } else {
      addFavorite(id)
      fetch('/api/wishlist', { method: 'POST', headers: withCsrfHeader({ 'Content-Type': 'application/json' }), credentials: 'include', body: JSON.stringify({ productId: id }) }).catch(() => {})
      setWishlistCount((c) => c + 1)
    }
  }

  const activeCount = listings.filter((l) => l).length
  const soldCount = 0 // API could add status filter later

  if (loading) {
    return (
      <div className="min-h-screen pt-20 pb-12 px-4 bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse w-full max-w-2xl h-64 bg-gray-200 rounded-2xl" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const favoriteIds = new Set(favorites)
  const productCards = listings.map((l) =>
    mapApiListingToProduct(
      {
        ...l,
        seller: { name: user.name, isVerified: false },
      },
      favoriteIds
    )
  )

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-modern p-8 mb-8"
        >
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
              <User className="w-12 h-12 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{user.name}</h1>
              <div className="flex items-center space-x-4 text-gray-600 flex-wrap gap-2">
                {user.location && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>{user.location}</span>
                  </div>
                )}
                {user.sellerVerified && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    <ShieldCheck className="w-4 h-4" /> Verified seller
                  </span>
                )}
              </div>
              <p className="text-gray-600 mt-2">{user.email}</p>
            </div>
          </div>
        </motion.div>

        {!user.sellerVerified && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-modern p-6 mb-8 border-2 border-amber-200 bg-amber-50/50"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              Seller verification
            </h2>
            <p className="text-gray-700 mb-4 text-sm">
              To sell on Weggo you must upload your government-issued ID. Verified sellers who break rules may be permanently banned.
            </p>
            <form onSubmit={handleUploadId} className="flex flex-wrap items-end gap-4">
              <label className="flex-1 min-w-[200px]">
                <span className="block text-sm font-medium text-gray-700 mb-1">Government-issued ID (photo)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-primary-100 file:text-primary-700"
                />
              </label>
              <button
                type="submit"
                disabled={uploadingId || !idFile}
                className="flex items-center gap-2 py-2.5 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                <FileUp className="w-4 h-4" />
                {uploadingId ? 'Uploading...' : 'Upload ID'}
              </button>
            </form>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card-modern p-6"
            >
              <h2 className="text-xl font-semibold mb-4">Quick Stats</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Package className="w-5 h-5 text-primary-600" />
                    <span>Active Listings</span>
                  </div>
                  <span className="text-2xl font-bold text-primary-600">{activeCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Heart className="w-5 h-5 text-red-500" />
                    <span>Favorites</span>
                  </div>
                  <span className="text-2xl font-bold text-red-500">{wishlistCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Package className="w-5 h-5 text-green-600" />
                    <span>Sold Items</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">{soldCount}</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card-modern p-6"
            >
              <h2 className="text-xl font-semibold mb-4">Actions</h2>
              <div className="space-y-3">
                <Link
                  href="/sell"
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors text-left font-medium text-primary-600"
                >
                  <Package className="w-5 h-5" />
                  <span>List an item</span>
                </Link>
                <Link
                  href="/favorites"
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                >
                  <Heart className="w-5 h-5" />
                  <span>My Favorites</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-red-50 rounded-lg transition-colors text-left text-red-600"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="card-modern p-6"
            >
              <h2 className="text-xl font-semibold mb-4">Saved Searches</h2>
              {savedSearches.length === 0 ? (
                <p className="text-sm text-gray-600">No saved searches yet. Save one from the Browse page.</p>
              ) : (
                <div className="space-y-2">
                  {savedSearches.slice(0, 10).map((s) => {
                    const params = new URLSearchParams(s.params || {}).toString()
                    const href = params ? `/browse?${params}` : '/browse'
                    return (
                      <div key={s._id} className="flex items-center justify-between gap-2">
                        <Link href={href} className="text-sm font-medium text-primary-600 hover:underline truncate">
                          {s.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => deleteSavedSearch(s._id)}
                          className="text-xs text-red-600 hover:underline flex-shrink-0"
                        >
                          Delete
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          </div>

          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card-modern p-6"
            >
              <h2 className="text-2xl font-bold mb-6">My Active Listings</h2>
              {listings.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">You haven&apos;t listed any items yet.</p>
                  <Link
                    href="/sell"
                    className="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
                  >
                    List your first item
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {productCards.map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      index={index}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
