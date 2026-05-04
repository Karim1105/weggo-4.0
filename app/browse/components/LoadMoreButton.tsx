'use client'

interface LoadMoreButtonProps {
  visible: boolean
  loading: boolean
  onClick: () => void
}

export default function LoadMoreButton({ visible, loading, onClick }: LoadMoreButtonProps) {
  if (!visible) return null

  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-400">Auto loading more listings</p>
      <button
        onClick={onClick}
        disabled={loading}
        className="px-6 py-3 bg-primary-500 text-white rounded-full font-semibold hover:bg-primary-600 transition-colors disabled:opacity-60"
      >
        {loading ? 'Loading more...' : 'Load more now'}
      </button>
    </div>
  )
}
