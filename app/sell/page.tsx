'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Camera, DollarSign, Sparkles, Upload, X, Tag, Wand2, ShieldAlert, FileUp, User } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import AIPricingSuggestion from '@/components/AIPricingSuggestion'
import { categorizeProduct } from '@/lib/categorization'
import { subcategoriesByCategory, withCsrfHeader } from '@/lib/utils'

interface ListingForm {
  title: string
  description: string
  category: string
  subcategory?: string
  condition: string
  price: number
  location: string
  images: FileList
}

export default function SellPage() {
  const [user, setUser] = useState<{ sellerVerified?: boolean; banned?: boolean } | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showVerificationDialog, setShowVerificationDialog] = useState(false)
  const [uploadingId, setUploadingId] = useState(false)
  const [idFile, setIdFile] = useState<File | null>(null)
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showPricingSuggestion, setShowPricingSuggestion] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<{
    category: string
    subcategory: string
    brand: string | null
    confidence: number
    suggestedTags: string[]
  } | null>(null)
  const [showAISuggestions, setShowAISuggestions] = useState(false)
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ListingForm>()

  const watchTitle = watch('title')
  const watchDescription = watch('description')
  const watchCategory = watch('category')
  const watchCondition = watch('condition')

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.user) {
          setUser(data.user)
          if (!data.user.sellerVerified && !data.user.banned) {
            setShowVerificationDialog(true)
          }
        }
      })
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false))
  }, [])

  const handleUploadId = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!idFile) {
      toast.error('Please select your government-issued ID')
      return
    }
    setUploadingId(true)
    try {
      const formData = new FormData()
      formData.append('idDocument', idFile)
      const res = await fetch('/api/auth/upload-id', {
        method: 'POST',
        headers: withCsrfHeader({}),
        credentials: 'include',
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        toast.success('You are now a verified seller!')
        setUser((prev) => (prev ? { ...prev, sellerVerified: true } : null))
        setShowVerificationDialog(false)
        setIdFile(null)
      } else {
        toast.error(data.error || 'Upload failed')
      }
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploadingId(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      const newFiles = Array.from(files)
      setImageFiles(prev => [...prev, ...newFiles])
      const newPreviews = newFiles.map(file => URL.createObjectURL(file))
      setImagePreviews(prev => [...prev, ...newPreviews])
    }
  }

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index])
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
    setImageFiles(prev => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: ListingForm) => {
    if (imageFiles.length === 0) {
      toast.error('Please add at least one photo')
      return
    }
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('title', data.title)
      formData.append('description', data.description)
      formData.append('category', data.category)
      if (data.subcategory) formData.append('subcategory', data.subcategory)
      formData.append('condition', data.condition)
      formData.append('price', String(data.price))
      formData.append('location', data.location)
      imageFiles.forEach((file) => formData.append('images', file))

      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: withCsrfHeader({}),
        credentials: 'include',
        body: formData,
      })
      const result = await res.json()

      if (res.status === 401) {
        toast.error('Please log in to list an item')
        window.location.href = '/login?redirect=/sell'
        return
      }
      if (res.status === 403 && result.code === 'VERIFICATION_REQUIRED') {
        setShowVerificationDialog(true)
        setUser((prev) => (prev ? { ...prev, sellerVerified: false } : null))
        toast.error(result.error)
        return
      }
      if (!result.success) {
        toast.error(result.error || 'Failed to create listing')
        return
      }
      toast.success('Listing created successfully!')
      setImageFiles([])
      setImagePreviews([])
      setValue('title', '')
      setValue('description', '')
      setValue('category', '')
      setValue('condition', '')
      setValue('price', 0)
      setValue('location', '')
      const createdListing = result.data?.listing || result.listing
      if (createdListing?._id) {
        window.location.href = `/listings/${createdListing._id}`
      }
    } catch (err) {
      toast.error('Failed to create listing')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePriceSuggestion = (suggestedPrice: number) => {
    setValue('price', suggestedPrice)
    setShowPricingSuggestion(false)
    toast.success(`Price set to ${suggestedPrice} EGP`)
  }

  // AI categorization when title and description change
  useEffect(() => {
    if (watchTitle && watchDescription && watchTitle.length > 5 && watchDescription.length > 10) {
      const suggestions = categorizeProduct(watchTitle, watchDescription)
      setAiSuggestions(suggestions)
    }
  }, [watchTitle, watchDescription])

  const applyAISuggestions = () => {
    if (aiSuggestions) {
      setValue('category', aiSuggestions.category)
      if (aiSuggestions.brand) {
        // Add brand to description if not already there
        const currentDesc = watchDescription || ''
        if (!currentDesc.toLowerCase().includes(aiSuggestions.brand.toLowerCase())) {
          setValue('description', `${currentDesc}\n\nBrand: ${aiSuggestions.brand}`)
        }
      }
      setShowAISuggestions(false)
      toast.success('AI suggestions applied!')
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    )
  }

  if (user?.banned) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 flex flex-col items-center justify-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Account restricted</h1>
        <p className="text-gray-600 text-center max-w-md">Your account has been banned from listing items.</p>
      </div>
    )
  }

  if (showVerificationDialog && !user?.sellerVerified) {
    return (
      <div className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 max-w-lg w-full"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Verified seller required</h2>
          </div>
          <p className="text-gray-700 mb-6">
            Before you can sell on Weggo, you must be a <strong>verified seller</strong>. Upload a photo of your government-issued ID (national ID or passport). This keeps the community safe; verified sellers who break the rules may be <strong>permanently banned</strong>.
          </p>
          <form onSubmit={handleUploadId} className="space-y-4 mb-6">
            <label className="block">
              <span className="text-sm font-medium text-gray-700 mb-2 block">Government-issued ID (photo)</span>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-700"
                />
              </div>
              {idFile && <p className="mt-1 text-sm text-gray-500">{idFile.name}</p>}
            </label>
            <button
              type="submit"
              disabled={uploadingId || !idFile}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              <FileUp className="w-5 h-5" />
              {uploadingId ? 'Uploading...' : 'Upload ID & become verified seller'}
            </button>
          </form>
          <Link
            href="/profile"
            className="flex items-center justify-center gap-2 py-3 text-primary-600 font-medium hover:underline"
          >
            <User className="w-5 h-5" />
            Go to Profile to upload ID later
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold mb-2 gradient-primary bg-clip-text text-transparent">
            Sell Your Item
          </h1>
          <p className="text-gray-600">List your item and let our AI help you price it right</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-modern p-8"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photos
              </label>
              <div className="grid grid-cols-4 gap-4 mb-4">
                {imagePreviews.map((image, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                    <img src={image} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 transition-colors">
                  <Camera className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-xs text-gray-500">Add Photo</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                {...register('title', { required: 'Title is required' })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="e.g., iPhone 13 Pro Max 256GB"
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                {...register('description', { required: 'Description is required' })}
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Describe your item in detail..."
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
              )}
              
              {/* AI Suggestions */}
              {aiSuggestions && aiSuggestions.confidence > 0.3 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Wand2 className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-blue-900">AI Suggestions</span>
                      <span className="text-sm text-blue-600">
                        ({Math.round(aiSuggestions.confidence * 100)}% confidence)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAISuggestions(!showAISuggestions)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      {showAISuggestions ? 'Hide' : 'Show'} Details
                    </button>
                  </div>
                  
                  {showAISuggestions && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Tag className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-800">
                          Suggested Category: <strong>{aiSuggestions.category}</strong>
                        </span>
                      </div>
                      {aiSuggestions.brand && (
                        <div className="flex items-center space-x-2">
                          <Tag className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-blue-800">
                            Detected Brand: <strong>{aiSuggestions.brand}</strong>
                          </span>
                        </div>
                      )}
                      {aiSuggestions.suggestedTags.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <Tag className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-blue-800">
                            Suggested Tags: <strong>{aiSuggestions.suggestedTags.join(', ')}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <button
                    type="button"
                    onClick={applyAISuggestions}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Apply AI Suggestions
                  </button>
                </motion.div>
              )}
            </div>

            {/* Category and Condition */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  {...register('category', { required: 'Category is required' })}
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
                </select>
                {errors.category && (
                  <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
                )}
                {watchCategory && subcategoriesByCategory[watchCategory]?.length > 0 && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory (optional)</label>
                    <select
                      {...register('subcategory')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">None</option>
                      {subcategoriesByCategory[watchCategory].map((sub) => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
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
                  {...register('condition', { required: 'Condition is required' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select condition</option>
                  <option value="New">New</option>
                  <option value="Like New">Like New</option>
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                </select>
                {errors.condition && (
                  <p className="text-red-500 text-sm mt-1">{errors.condition.message}</p>
                )}
              </div>
            </div>

            {/* Price with AI Suggestion */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Price (EGP) *
                </label>
                <button
                  type="button"
                  onClick={() => setShowPricingSuggestion(true)}
                  className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                  disabled={!watchTitle || !watchCategory || !watchCondition}
                >
                  <Sparkles className="w-4 h-4" />
                  Get AI Price Suggestion
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-gray-500">EGP</span>
                </div>
                <input
                  {...register('price', { required: 'Price is required', min: 0 })}
                  type="number"
                  className="w-full pl-16 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              {errors.price && (
                <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <select
                {...register('location', { required: 'Location is required' })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select your city</option>
                <option value="cairo">Cairo</option>
                <option value="giza">Giza</option>
                <option value="alexandria">Alexandria</option>
                <option value="sharm-el-sheikh">Sharm El Sheikh</option>
                <option value="hurghada">Hurghada</option>
                <option value="luxor">Luxor</option>
                <option value="aswan">Aswan</option>
                <option value="port-said">Port Said</option>
                <option value="suez">Suez</option>
                <option value="mansoura">Mansoura</option>
              </select>
              {errors.location && (
                <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={submitting}
              className="w-full gradient-primary text-white py-4 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-70"
            >
              {submitting ? 'Creating listing...' : 'List Item'}
            </motion.button>
          </form>
        </motion.div>
      </div>

      {/* AI Pricing Suggestion Modal */}
      {showPricingSuggestion && (
        <AIPricingSuggestion
          title={watchTitle}
          description={watchDescription}
          category={watchCategory}
          condition={watchCondition}
          onClose={() => setShowPricingSuggestion(false)}
          onSelectPrice={handlePriceSuggestion}
        />
      )}
    </div>
  )
}

