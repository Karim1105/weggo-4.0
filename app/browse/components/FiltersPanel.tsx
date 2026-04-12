'use client'

import { motion } from 'framer-motion'
import { subcategoriesByCategory } from '@/lib/utils'

interface CategoryOption {
  id: string
  name: string
}

interface FiltersPanelProps {
  categories: string[]
  categoryLabels: Record<string, string>
  selectedCategory: string
  selectedSubcategory: string
  priceRange: [number, number]
  locationFilter: string
  nearMeEnabled: boolean
  onCategoryChange: (value: string) => void
  onSubcategoryChange: (value: string) => void
  onPriceRangeChange: (value: [number, number]) => void
  onLocationChange: (value: string) => void
  onNearMeToggle: () => void
}

const DEFAULT_MIN_PRICE = 0
const DEFAULT_MAX_PRICE = 1_000_000

const parsePrice = (value: string, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

export default function FiltersPanel(props: FiltersPanelProps) {
  const {
    categories,
    categoryLabels,
    selectedCategory,
    selectedSubcategory,
    priceRange,
    locationFilter,
    nearMeEnabled,
    onCategoryChange,
    onSubcategoryChange,
    onPriceRangeChange,
    onLocationChange,
    onNearMeToggle,
  } = props

  const subcategories: CategoryOption[] =
    selectedCategory && selectedCategory !== 'all' ? subcategoriesByCategory[selectedCategory] || [] : []

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-6 p-6 bg-white/90 rounded-2xl border border-gray-200"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Category</h3>
          <div className="space-y-2">
            {categories.map((catId) => (
              <label key={catId} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="category"
                  value={catId}
                  checked={selectedCategory === catId}
                  onChange={(e) => onCategoryChange(e.target.value)}
                  className="text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{categoryLabels[catId] ?? catId}</span>
              </label>
            ))}
          </div>
          {subcategories.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Subcategory</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onSubcategoryChange('all')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedSubcategory === 'all'
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {subcategories.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => onSubcategoryChange(sub.id)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedSubcategory === sub.id
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Price Range</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Min Price</label>
              <input
                type="number"
                value={priceRange[0]}
                onChange={(e) => {
                  const nextMin = parsePrice(e.target.value, DEFAULT_MIN_PRICE)
                  onPriceRangeChange([Math.min(nextMin, priceRange[1]), priceRange[1]])
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Max Price</label>
              <input
                type="number"
                value={priceRange[1]}
                onChange={(e) => {
                  const nextMax = parsePrice(e.target.value, DEFAULT_MAX_PRICE)
                  onPriceRangeChange([priceRange[0], Math.max(nextMax, priceRange[0])])
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder={String(DEFAULT_MAX_PRICE)}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Location</h3>
          <input
            type="text"
            value={locationFilter}
            onChange={(e) => onLocationChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="e.g. Cairo"
          />
          <p className="text-xs text-gray-500 mt-2">
            Tip: use "Use profile location" if your profile has a location.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Quick Filters</h3>
          <div className="space-y-2">
            <button
              type="button"
              onClick={onNearMeToggle}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {nearMeEnabled ? 'Clear profile location filter' : 'Use profile location'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
