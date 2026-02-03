'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { subcategoriesByCategory, withCsrfHeader } from '@/lib/utils'

interface Listing {
  _id: string
  title: string
  description: string
  price: number
  location: string
  condition: string
  category: string
  subcategory?: string
}

export default function EditListingPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState<number | ''>('')
  const [location, setLocation] = useState('')
  const [condition, setCondition] = useState('')
  const [category, setCategory] = useState('')
  const [subcategory, setSubcategory] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/listings/${id}`, { credentials: 'include' })
        const data = await res.json()
        if (res.status === 401) {
          router.push(`/login?redirect=/listings/${id}/edit`)
          return
        }
        if (!data.success || !data.product) {
          setError(data.error || 'Failed to load listing')
          return
        }
        const p: Listing = data.product
        setTitle(p.title)
        setDescription(p.description)
        setPrice(p.price)
        setLocation(p.location)
        setCondition(p.condition)
        setCategory(p.category)
        setSubcategory(p.subcategory || '')
      } catch {
        setError('Failed to load listing')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim() || !price || !location.trim() || !condition || !category) {
      toast.error('Please fill in all required fields')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'PUT',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          price: Number(price),
          location: location.trim(),
          condition,
          category,
          subcategory: subcategory || undefined,
        }),
      })
      const data = await res.json()
      if (res.status === 401) {
        router.push(`/login?redirect=/listings/${id}/edit`)
        return
      }
      if (!data.success) {
        toast.error(data.error || 'Failed to update listing')
        return
      }
      toast.success('Listing updated')
      router.push(`/listings/${id}`)
      router.refresh()
    } catch {
      toast.error('Failed to update listing')
    } finally {
      setSaving(false)
    }
  }

  const availableSubcategories = category ? subcategoriesByCategory[category] || [] : []

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center justify-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Link
          href={`/listings/${id}`}
          className="text-primary-600 hover:underline flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to listing
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <Link
          href={`/listings/${id}`}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to listing
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-modern p-8"
        >
          <h1 className="text-2xl font-bold mb-6">Edit Listing</h1>
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value)
                    setSubcategory('')
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select a category</option>
                  <option value="electronics">Electronics</option>
                  <option value="furniture">Furniture</option>
                  <option value="fashion">Fashion</option>
                  <option value="vehicles">Vehicles</option>
                  <option value="home">Home & Garden</option>
                  <option value="sports">Sports & Outdoors</option>
                  <option value="books">Books & Media</option>
                  <option value="toys">Toys & Games</option>
                  <option value="gaming">Gaming</option>
                  <option value="music">Music</option>
                </select>

                {availableSubcategories.length > 0 && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subcategory (optional)
                    </label>
                    <select
                      value={subcategory}
                      onChange={(e) => setSubcategory(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">None</option>
                      {availableSubcategories.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Condition *
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select condition</option>
                  <option value="New">New</option>
                  <option value="Like New">Like New</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price (EGP) *
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location *
                </label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={saving}
              className="w-full gradient-primary text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-70"
            >
              {saving ? 'Saving changes...' : 'Save Changes'}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}

