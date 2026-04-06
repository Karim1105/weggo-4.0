'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { AlertTriangle, Send, CheckCircle, XCircle, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { withCsrfHeader } from '@/lib/utils'

interface Appeal {
  _id: string
  email: string
  status: 'pending' | 'approved' | 'rejected'
  appealMessage: string
  reason: string
  rejectionReason?: string
  createdAt: string
  reviewedAt?: string
}

export default function AppealsPage() {
  const router = useRouter()
  const [appealMessage, setAppealMessage] = useState('')
  const [email, setEmail] = useState('')
  const [appeals, setAppeals] = useState<Appeal[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [charCount, setCharCount] = useState(0)

  useEffect(() => {
    fetchUser()
    fetchAppeals()
  }, [])

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setUser(data.user)
        setIsAuthenticated(true)
        setEmail(data.user.email)
      } else {
        setIsAuthenticated(false)
      }
    } catch (error) {
      setIsAuthenticated(false)
    }
  }

  const fetchAppeals = async () => {
    setIsFetching(true)
    try {
      const res = await fetch('/api/users/ban-appeals', { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setAppeals(data.data.appeals)
      }
    } catch (error) {
      // Not authenticated or no appeals
      setAppeals([])
    } finally {
      setIsFetching(false)
    }
  }

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault()

    if (charCount < 10) {
      toast.error('Appeal message must be at least 10 characters')
      return
    }

    if (charCount > 4096) {
      toast.error('Appeal message cannot exceed 4096 characters')
      return
    }

    if (!email || !email.trim()) {
      toast.error('Email is required')
      return
    }

    setIsLoading(true)
    try {
      // Use public endpoint for unauthenticated users
      const endpoint = isAuthenticated ? '/api/users/ban-appeals/submit' : '/api/auth/ban-appeal'
      const body = isAuthenticated ? { appealMessage } : { email, appealMessage }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(data.message || 'Appeal submitted successfully')
        setAppealMessage('')
        setCharCount(0)
        if (isAuthenticated) {
          fetchAppeals()
        }
      } else {
        toast.error(data.error || 'Failed to submit appeal')
      }
    } catch (error) {
      toast.error('Failed to submit appeal')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const message = e.target.value
    setAppealMessage(message)
    setCharCount(message.length)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pt-24 pb-12 px-4">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Ban Appeal</h1>
        <p className="text-gray-600">
          {isAuthenticated 
            ? "Submit an appeal to contest your account ban. Our team will review it within 48 hours."
            : "If your account has been banned, you can submit an appeal below. Our team will review it within 48 hours."}
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-8">
        {/* Ban Info Card */}
        {user?.banned && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-red-200 p-6"
          >
            <div className="flex items-start gap-4">
              <div className="bg-red-100 p-3 rounded-full mt-1">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Account Status: Banned</h2>
                <p className="text-gray-600 mb-3">
                  Your account has been banned for the following reason:
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-gray-700">{user.bannedReason || 'No reason provided'}</p>
                </div>
                {user.bannedAt && (
                  <p className="text-xs text-gray-500 mt-2">
                    Banned on {new Date(user.bannedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Submit Appeal Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm p-6"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Submit Your Appeal</h2>

          <form onSubmit={handleSubmitAppeal} className="space-y-6">
            {!isAuthenticated && (
              <div>
                <label className="block text-gray-700 font-semibold mb-3">
                  Email Address <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
              </div>
            )}

            <div>
              <label className="block text-gray-700 font-semibold mb-3">
                Appeal Message <span className="text-red-600">*</span>
              </label>
              <textarea
                value={appealMessage}
                onChange={handleMessageChange}
                placeholder="Explain why you believe your ban should be lifted. Please be detailed and respectful..."
                disabled={isLoading || (isAuthenticated && appeals.some((a) => a.status === 'pending'))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-50"
                rows={6}
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500">
                  Minimum 10 characters • Maximum 4096 characters
                </p>
                <p className={`text-sm font-medium ${
                  charCount < 10 || charCount > 4096 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {charCount} / 4096
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || (isAuthenticated && appeals.some((a) => a.status === 'pending')) || charCount < 10 || !email}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold transition flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              {isLoading ? 'Submitting...' : 'Submit Appeal'}
            </button>

            {isAuthenticated && appeals.some((a) => a.status === 'pending') && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⏳ You already have a pending appeal. Our team is reviewing it. Please check back later.
                </p>
              </div>
            )}
          </form>
        </motion.div>

        {/* Appeals History */}
        {isAuthenticated && !isFetching && appeals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm p-6"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Appeals</h2>
            <div className="space-y-4">
              {appeals.map((appeal) => (
                <div
                  key={appeal._id}
                  className="border rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {appeal.status === 'pending' && (
                        <>
                          <div className="bg-yellow-100 p-2 rounded-full">
                            <Clock className="w-5 h-5 text-yellow-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">Pending Review</p>
                            <p className="text-xs text-gray-500">
                              Submitted {new Date(appeal.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </>
                      )}
                      {appeal.status === 'approved' && (
                        <>
                          <div className="bg-green-100 p-2 rounded-full">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">Appeal Approved</p>
                            <p className="text-xs text-gray-500">
                              Reviewed {new Date(appeal.reviewedAt || '').toLocaleDateString()}
                            </p>
                          </div>
                        </>
                      )}
                      {appeal.status === 'rejected' && (
                        <>
                          <div className="bg-red-100 p-2 rounded-full">
                            <XCircle className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">Appeal Rejected</p>
                            <p className="text-xs text-gray-500">
                              Reviewed {new Date(appeal.reviewedAt || '').toLocaleDateString()}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      appeal.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      appeal.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {appeal.status.charAt(0).toUpperCase() + appeal.status.slice(1)}
                    </span>
                  </div>

                  <div className="bg-gray-50 rounded p-3 mb-3">
                    <p className="text-sm text-gray-700">{appeal.appealMessage}</p>
                  </div>

                  {appeal.status === 'rejected' && appeal.rejectionReason && (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <p className="text-xs text-red-600 font-semibold mb-1">Rejection Reason:</p>
                      <p className="text-sm text-red-700">{appeal.rejectionReason}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* No Appeals Message */}
        {isAuthenticated && !isFetching && appeals.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm p-8 text-center"
          >
            <p className="text-gray-600">You haven't submitted any appeals yet.</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
