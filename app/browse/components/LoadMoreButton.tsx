'use client'

interface LoadMoreButtonProps {
  visible: boolean
  loading: boolean
  onClick: () => void
}

export default function LoadMoreButton({ visible, loading, onClick }: LoadMoreButtonProps) {
  if (!visible) return null

  return (
    <div className="mt-8 flex justify-center">
      <button
        onClick={onClick}
        disabled={loading}
        className="px-6 py-3 bg-primary-500 text-white rounded-full font-semibold hover:bg-primary-600 transition-colors disabled:opacity-60"
      >
        {loading ? 'Loading more...' : 'Load more'}
      </button>
    </div>
  )
}
