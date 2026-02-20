'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { withCsrfHeader } from '@/lib/utils'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()

      if (data.success) {
        setSubmitted(true)
        toast.success('If the email exists, a reset link has been generated.')
      } else {
        toast.error(data.error || 'Failed to submit request')
      }
    } catch {
      toast.error('Failed to submit request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50/30 via-orange-50/20 to-red-50/15 pt-24 pb-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 w-full max-w-md"
      >
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Forgot password</h1>
          <p className="text-gray-600">Enter your account email to request a reset link.</p>
        </div>

        {submitted ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            If an account exists with this email, you will receive reset instructions.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-700 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Send reset request'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  )
}
