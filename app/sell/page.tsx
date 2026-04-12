'use client'

import { useCallback, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useForm, useWatch } from 'react-hook-form'
import toast from 'react-hot-toast'
import AIPricingSuggestion from '@/components/AIPricingSuggestion'
import AISuggestionsPanel from './components/AISuggestionsPanel'
import CategoryConditionFields from './components/CategoryConditionFields'
import ImageUpload from './components/ImageUpload'
import ListingDetailsFields from './components/ListingDetailsFields'
import LocationField from './components/LocationField'
import PricingSection from './components/PricingSection'
import VerificationDialog from './components/VerificationDialog'
import { useAISuggestions } from './hooks/useAISuggestions'
import { useImageUpload } from './hooks/useImageUpload'
import { useSubmitListing } from './hooks/useSubmitListing'
import { useVerification } from './hooks/useVerification'
import type { ListingFormValues } from './types'

export default function SellPage() {
  const [showPricingSuggestion, setShowPricingSuggestion] = useState(false)
  const { register, control, handleSubmit, setValue, reset, formState: { errors } } = useForm<ListingFormValues>()
  const watchTitle = useWatch({ control, name: 'title' }) || ''
  const watchDescription = useWatch({ control, name: 'description' }) || ''
  const watchCategory = useWatch({ control, name: 'category' }) || ''
  const watchCondition = useWatch({ control, name: 'condition' }) || ''

  const {
    showVerificationDialog,
    uploadingId,
    nationalIdNumber,
    openVerificationDialog,
    handleNationalIdChange,
    submitVerification,
  } = useVerification()

  const {
    imageFiles,
    imagePreviews,
    handleImageUpload,
    removeImage,
    clearImages,
  } = useImageUpload()

  const {
    aiSuggestions,
    showAISuggestions,
    canShowAISuggestions,
    toggleAISuggestionDetails,
    applyAISuggestions,
  } = useAISuggestions({
    title: watchTitle,
    description: watchDescription,
    setValue,
  })

  const handleSubmitSuccess = useCallback(() => {
    clearImages()
    reset({
      title: '',
      description: '',
      category: '',
      subcategory: '',
      condition: '',
      price: 0,
      location: '',
    })
  }, [clearImages, reset])

  const { submitting, submitListing } = useSubmitListing({
    onVerificationRequired: openVerificationDialog,
    onSuccess: handleSubmitSuccess,
  })

  const handlePriceSuggestion = useCallback((suggestedPrice: number) => {
    setValue('price', suggestedPrice)
    setShowPricingSuggestion(false)
    toast.success(`Price set to ${suggestedPrice} EGP`)
  }, [setValue])

  const handleListingSubmit = useCallback((data: ListingFormValues) => {
    return submitListing(data, imageFiles)
  }, [imageFiles, submitListing])

  const canOpenPriceSuggestion = useMemo(
    () => Boolean(watchTitle && watchCategory && watchCondition),
    [watchCategory, watchCondition, watchTitle],
  )

  if (showVerificationDialog) {
    return (
      <VerificationDialog
        uploadingId={uploadingId}
        nationalIdNumber={nationalIdNumber}
        onNationalIdChange={handleNationalIdChange}
        onSubmit={submitVerification}
      />
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
          <form onSubmit={handleSubmit(handleListingSubmit)} className="space-y-6">
            <ImageUpload
              imagePreviews={imagePreviews}
              onUpload={handleImageUpload}
              onRemove={removeImage}
            />

            <ListingDetailsFields
              register={register}
              errors={errors}
              aiPanel={
                canShowAISuggestions && aiSuggestions ? (
                  <AISuggestionsPanel
                    aiSuggestions={aiSuggestions}
                    showAISuggestions={showAISuggestions}
                    onToggleDetails={toggleAISuggestionDetails}
                    onApply={applyAISuggestions}
                  />
                ) : null
              }
            />

            <CategoryConditionFields
              register={register}
              errors={errors}
              selectedCategory={watchCategory}
            />

            <PricingSection
              register={register}
              priceError={errors.price}
              canOpenAISuggestion={canOpenPriceSuggestion}
              onOpenAISuggestion={() => setShowPricingSuggestion(true)}
            />

            <LocationField
              register={register}
              error={errors.location}
            />

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
