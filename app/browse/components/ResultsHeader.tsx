'use client'

import { Search } from 'lucide-react'
import { Product } from '@/app/browse/types'

interface ResultsHeaderProps {
  loading: boolean
  products: Product[]
  totalCount: number | null
  searchQuery: string
  selectedCategory: string
  selectedSubcategory: string
  categoryLabels: Record<string, string>
  subcategories: { id: string; name: string }[]
}

export default function ResultsHeader({
  loading,
  products,
  totalCount,
  searchQuery,
  selectedCategory,
  selectedSubcategory,
  categoryLabels,
  subcategories,
}: ResultsHeaderProps) {
  const visibleCount = products.length
  const resolvedTotal = totalCount ?? visibleCount

  if (!loading && typeof window !== 'undefined') {
     console.log('ResultsHeader render:', { loading, visibleCount, totalCount, resolvedTotal, searchQuery })
  }

  return (
    <div className="flex items-center justify-between mb-8 min-h-[80px]">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {loading ? 'Loading...' : `${resolvedTotal} items found`}
        </h1>
        <p className="text-gray-600 min-h-[24px]">
          {!loading && resolvedTotal > visibleCount ? (
            <span>Showing {visibleCount} loaded items so far</span>
          ) : null}
          {!loading && !!searchQuery ? (
            <span>Search results for "{searchQuery}"</span>
          ) : null}
          {!loading && selectedCategory !== 'all' && !searchQuery ? (
            <span>
              in {categoryLabels[selectedCategory] || selectedCategory}
              {selectedSubcategory !== 'all' && subcategories.find((s) => s.id === selectedSubcategory) ? (
                <span> &rarr; {subcategories.find((s) => s.id === selectedSubcategory)?.name}</span>
              ) : null}
            </span>
          ) : null}
        </p>
      </div>
    </div>
  )
}

export function EmptyResults({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="text-center py-12">
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Search className="w-12 h-12 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">No items found</h3>
      <p className="text-gray-600 mb-6">Try adjusting your search or filter criteria</p>
      <button
        onClick={onClearFilters}
        className="px-6 py-3 bg-primary-500 text-white rounded-full font-semibold hover:bg-primary-600 transition-colors"
      >
        Clear Filters
      </button>
    </div>
  )
}
