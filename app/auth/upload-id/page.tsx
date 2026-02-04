'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Shield, CheckCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { withCsrfHeader } from '@/lib/utils'

export default function UploadIdPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file type
    if (!selectedFile.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }

    setFile(selectedFile)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(selectedFile)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      toast.error('Please select a file to upload')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('idDocument', file)

      const headers = withCsrfHeader({}) as Record<string, string>

      const res = await fetch('/api/auth/upload-id', {
        method: 'POST',
        headers: headers,
        body: formData,
        credentials: 'include',
      })

      const data = await res.json()

      if (data.success) {
        toast.success('ID uploaded successfully! Verification pending.')
        router.push('/profile')
      } else {
        toast.error(data.error || 'Upload failed')
      }
    } catch (error) {
      toast.error('Upload failed. Please try again.')
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
            Upload a valid government ID to become a verified featured seller
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
                  Your ID is encrypted and only used for verification purposes
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Form */}
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Upload Government ID</h2>

          <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-blue-900 text-sm font-medium mb-2">Accepted Documents:</p>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• National ID Card</li>
                  <li>• Passport</li>
                  <li>• Driver's License</li>
                </ul>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload ID Photo
              </label>
              
              {!preview ? (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-primary-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="id-upload"
                  />
                  <label htmlFor="id-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
                    <p className="text-sm text-gray-500">PNG, JPG up to 5MB</p>
                  </label>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={preview}
                    alt="ID preview"
                    className="w-full rounded-xl border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null)
                      setPreview(null)
                    }}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            <div className="mb-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
              <p className="text-yellow-900 text-sm">
                <strong>Important:</strong> Make sure your photo is clear, all corners are visible, 
                and text is readable. Blurry or incomplete photos will be rejected.
              </p>
            </div>

            <button
              type="submit"
              disabled={!file || uploading}
              className="w-full px-8 py-4 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-full font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Uploading...</span>
                </div>
              ) : (
                'Submit for Verification'
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600">
            Processing usually takes 1-2 business days
          </p>
        </div>
      </div>
    </div>
  )
}
