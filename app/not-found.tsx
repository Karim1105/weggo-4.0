import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  // Keep 404 status but use a friendlier title in the browser tab
  title: 'Weggo',
}

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Page not found</h1>
      <p className="text-gray-600 mb-6 text-center max-w-md">
        The page you are looking for does not exist.
      </p>
      <Link
        href="/"
        className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700"
      >
        Go back home
      </Link>
    </div>
  )
}
