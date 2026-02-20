'use client'

import { useEffect, useState } from 'react'

interface Review {
  _id: string
  reviewer: {
    _id: string
    name: string
    avatar?: string
  }
  rating: number
  comment: string
  createdAt: string
}

interface ReviewsListProps {
  sellerId: string
  productId?: string
  page?: number
  limit?: number
  onPageChange?: (page: number) => void
}

export default function ReviewsList({
  sellerId,
  productId,
  page = 1,
  limit = 5,
  onPageChange,
}: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [sellerStats, setSellerStats] = useState({
    averageRating: 0,
    totalReviews: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(page)
  const [totalPages, setTotalPages] = useState(0)

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          sellerId,
          limit: limit.toString(),
          page: currentPage.toString(),
        })

        if (productId) {
          params.append('productId', productId)
        }

        const response = await fetch(`/api/reviews?${params}`, {
          credentials: 'include',
        })
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch reviews')
        }

        setReviews(data.reviews || [])
        setSellerStats({
          averageRating: data.averageRating || 0,
          totalReviews: data.totalReviews || 0,
        })
        setTotalPages(Math.ceil((data.totalReviews || 0) / limit))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch reviews')
      } finally {
        setLoading(false)
      }
    }

    fetchReviews()
  }, [sellerId, productId, currentPage, limit])

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    if (onPageChange) {
      onPageChange(newPage)
    }
  }

  if (loading && reviews.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-800">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Seller Rating Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Seller Rating</h3>
        <div className="flex items-center gap-4">
          <div className="text-4xl font-bold text-gray-900">
            {sellerStats.averageRating.toFixed(1)}
          </div>
          <div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-2xl ${
                    star <= Math.round(sellerStats.averageRating)
                      ? 'text-yellow-400'
                      : 'text-gray-300'
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Based on {sellerStats.totalReviews} review{sellerStats.totalReviews !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No reviews yet. Be the first to review!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review._id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {review.reviewer.avatar && (
                    <img
                      src={review.reviewer.avatar}
                      alt={review.reviewer.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">
                      {review.reviewer.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`text-lg ${
                        star <= review.rating ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-gray-700 text-sm">{review.comment}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            ← Previous
          </button>

          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => handlePageChange(p)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  currentPage === p
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
