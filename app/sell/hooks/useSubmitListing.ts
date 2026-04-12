import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { createListingRequest } from '../api'
import type { ListingFormValues } from '../types'

interface UseSubmitListingParams {
  onVerificationRequired: () => void
  onSuccess: () => void
}

export function useSubmitListing({ onVerificationRequired, onSuccess }: UseSubmitListingParams) {
  const [submitting, setSubmitting] = useState(false)

  const submitListing = useCallback(async (data: ListingFormValues, imageFiles: File[]) => {
    if (imageFiles.length === 0) {
      toast.error('Please add at least one photo')
      return
    }

    setSubmitting(true)
    try {
      const { status, data: result } = await createListingRequest(data, imageFiles)

      if (status === 401) {
        toast.error('Please log in to list an item')
        window.location.href = '/login?redirect=/sell'
        return
      }

      if (status === 403 && result.code === 'VERIFICATION_REQUIRED') {
        onVerificationRequired()
        toast.error(result.error || 'Verification is required')
        return
      }

      if (status === 403 && result.code === 'ACCOUNT_BANNED') {
        toast.error(result.error || 'Your account is restricted from listing items')
        return
      }

      if (!result.success) {
        toast.error(result.error || 'Failed to create listing')
        return
      }

      toast.success('Listing created successfully!')
      onSuccess()

      const createdListing = result.data?.listing || result.listing
      if (createdListing?._id) {
        window.location.href = `/listings/${createdListing._id}`
      }
    } catch {
      toast.error('Failed to create listing')
    } finally {
      setSubmitting(false)
    }
  }, [onSuccess, onVerificationRequired])

  return {
    submitting,
    submitListing,
  }
}
