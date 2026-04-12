import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { uploadNationalIdRequest } from '../api'
import { NATIONAL_ID_GENERIC_ERROR } from '@/lib/validators'

export function useVerification() {
  const [showVerificationDialog, setShowVerificationDialog] = useState(false)
  const [uploadingId, setUploadingId] = useState(false)
  const [nationalIdNumber, setNationalIdNumber] = useState('')

  const openVerificationDialog = useCallback(() => {
    setShowVerificationDialog(true)
  }, [])

  const handleNationalIdChange = useCallback((value: string) => {
    setNationalIdNumber(value)
  }, [])

  const submitVerification = useCallback(async (event: React.FormEvent) => {
    event.preventDefault()
    setUploadingId(true)

    try {
      const { data } = await uploadNationalIdRequest(nationalIdNumber)
      if (data.success) {
        toast.success('You are now a verified seller!')
        setShowVerificationDialog(false)
        setNationalIdNumber('')
        return
      }

      toast.error(data.error || NATIONAL_ID_GENERIC_ERROR)
    } catch {
      toast.error(NATIONAL_ID_GENERIC_ERROR)
    } finally {
      setUploadingId(false)
    }
  }, [nationalIdNumber])

  return {
    showVerificationDialog,
    uploadingId,
    nationalIdNumber,
    openVerificationDialog,
    handleNationalIdChange,
    submitVerification,
  }
}
