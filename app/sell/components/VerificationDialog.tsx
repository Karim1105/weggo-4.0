import Link from 'next/link'
import { motion } from 'framer-motion'
import { ShieldAlert, User } from 'lucide-react'

interface VerificationDialogProps {
  uploadingId: boolean
  nationalIdNumber: string
  onNationalIdChange: (value: string) => void
  onSubmit: (event: React.FormEvent) => void
}

export default function VerificationDialog({
  uploadingId,
  nationalIdNumber,
  onNationalIdChange,
  onSubmit,
}: VerificationDialogProps) {
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
          Before you can sell on Weggo, you must be a <strong>verified seller</strong>. Enter your National ID number to complete verification. This keeps the community safe; verified sellers who break the rules may be <strong>permanently banned</strong>.
        </p>
        <form onSubmit={onSubmit} className="space-y-4 mb-6">
          <label className="block">
            <span className="text-sm font-medium text-gray-700 mb-2 block">National ID Number</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={nationalIdNumber}
              onChange={(event) => onNationalIdChange(event.target.value)}
              placeholder="Enter your 14-digit ID number"
              className="block w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </label>
          <button
            type="submit"
            disabled={uploadingId}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {uploadingId ? 'Submitting...' : 'Submit National ID & become verified seller'}
          </button>
        </form>
        <Link
          href="/profile"
          className="flex items-center justify-center gap-2 py-3 text-primary-600 font-medium hover:underline"
        >
          <User className="w-5 h-5" />
          Go to Profile to complete verification later
        </Link>
      </motion.div>
    </div>
  )
}
