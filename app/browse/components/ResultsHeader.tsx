'use client'

import { Search } from 'lucide-react'
import { Product } from '@/app/browse/types'

interface ResultsHeaderProps {
  loading: boolean
  products: Product[]
  searchQuery: string
  selectedCategory: string
  selectedSubcategory: string
  categoryLabels: Record<string, string>
  subcategories: { id: string; name: string }[]
}

export default function ResultsHeader({
  loading,
  products,
  searchQuery,
  selectedCategory,
  selectedSubcategory,
  categoryLabels,
  subcategories,
}: ResultsHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8 min-h-[80px]">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {loading ? 'Loading...' : `${products.length} items found`}
        </h1>
        <p className="text-gray-600 min-h-[24px]">
          {!loading && searchQuery && `Search results for "${searchQuery}"`}
          {!loading && selectedCategory !== 'all' && !searchQuery && (
            <span>
              in {categoryLabels[selectedCategory] || selectedCategory}
              {selectedSubcategory !== 'all' && subcategories.find((s) => s.id === selectedSubcategory) && (
                <span> &rarr; {subcategories.find((s) => s.id === selectedSubcategory)?.name}</span>
              )}
            </span>
          )}
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
