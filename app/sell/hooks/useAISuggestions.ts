import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import type { UseFormSetValue } from 'react-hook-form'
import { useDebouncedValue } from '@/app/browse/hooks/useDebouncedValue'
import { categorizeProduct } from '@/lib/categorization'
import {
  AI_CONFIDENCE_THRESHOLD,
  AI_DEBOUNCE_MS,
  AI_DESCRIPTION_MIN_LENGTH,
  AI_TITLE_MIN_LENGTH,
} from '../constants'
import type { AISuggestion, ListingFormValues } from '../types'

interface UseAISuggestionsParams {
  title: string
  description: string
  setValue: UseFormSetValue<ListingFormValues>
}

export function useAISuggestions({ title, description, setValue }: UseAISuggestionsParams) {
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion | null>(null)
  const [showAISuggestions, setShowAISuggestions] = useState(false)

  const debouncedTitle = useDebouncedValue(title, AI_DEBOUNCE_MS)
  const debouncedDescription = useDebouncedValue(description, AI_DEBOUNCE_MS)

  useEffect(() => {
    const canSuggest =
      debouncedTitle?.length > AI_TITLE_MIN_LENGTH &&
      debouncedDescription?.length > AI_DESCRIPTION_MIN_LENGTH

    if (!canSuggest) {
      setAiSuggestions(null)
      setShowAISuggestions(false)
      return
    }

    setAiSuggestions(categorizeProduct(debouncedTitle, debouncedDescription))
  }, [debouncedDescription, debouncedTitle])

  const toggleAISuggestionDetails = useCallback(() => {
    setShowAISuggestions((prev) => !prev)
  }, [])

  const applyAISuggestions = useCallback(() => {
    if (!aiSuggestions) return

    setValue('category', aiSuggestions.category)
    if (aiSuggestions.subcategory) {
      setValue('subcategory', aiSuggestions.subcategory)
    }

    if (aiSuggestions.brand) {
      const currentDesc = description || ''
      if (!currentDesc.toLowerCase().includes(aiSuggestions.brand.toLowerCase())) {
        setValue('description', `${currentDesc}\n\nBrand: ${aiSuggestions.brand}`)
      }
    }

    setShowAISuggestions(false)
    toast.success('AI suggestions applied!')
  }, [aiSuggestions, description, setValue])

  return {
    aiSuggestions,
    showAISuggestions,
    canShowAISuggestions: !!aiSuggestions && aiSuggestions.confidence > AI_CONFIDENCE_THRESHOLD,
    toggleAISuggestionDetails,
    applyAISuggestions,
  }
}
