'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { withCsrfHeader } from '@/lib/utils'
import { NATIONAL_ID_GENERIC_ERROR, validateEgyptianNationalId } from '@/lib/validators'

export default function UploadIdPage() {
  const router = useRouter()
  const [nationalIdNumber, setNationalIdNumber] = useState('')
  const [uploading, setUploading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validation = validateEgyptianNationalId(nationalIdNumber)
    if (!validation.valid) {
      toast.error(NATIONAL_ID_GENERIC_ERROR)
      return
    }

    setUploading(true)

    try {
      const headers = withCsrfHeader({ 'Content-Type': 'application/json' }) as Record<string, string>

      const res = await fetch('/api/auth/upload-id', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ nationalIdNumber: nationalIdNumber.trim() }),
        credentials: 'include',
      })

      const data = await res.json()

      if (data.success) {
        toast.success('National ID submitted successfully!')
        router.push('/profile')
      } else {
        toast.error(data.error || NATIONAL_ID_GENERIC_ERROR)
      }
    } catch (error) {
      toast.error(NATIONAL_ID_GENERIC_ERROR)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 py-20 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Verify Your Identity
          </h1>
          <p className="text-xl text-gray-600">
            Enter your Egyptian National ID to become a verified featured seller
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Why Verify?</h3>
                <p className="text-sm text-gray-600">
                  Verified sellers get featured placement, higher visibility, and buyer trust
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Your Privacy</h3>
                <p className="text-sm text-gray-600">
                  Your information is only used for verification purposes
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Form */}
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-6">National ID Verification</h2>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="nationalIdNumber" className="block text-sm font-medium text-gray-700 mb-2">
                National ID Number
              </label>
              <input
                id="nationalIdNumber"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={14}
                value={nationalIdNumber}
                onChange={(e) => setNationalIdNumber(e.target.value.replace(/\D/g, '').slice(0, 14))}
                placeholder="Enter your 14-digit ID number"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <button
              type="submit"
              disabled={uploading || nationalIdNumber.length === 0}
              className="w-full px-8 py-4 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-full font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </div>
              ) : (
                'Submit for Verification'
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600">
            Verification is completed instantly after successful submission
          </p>
        </div>
      </div>
    </div>
  )
}
