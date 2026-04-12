import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { categories as listingCategories, subcategoriesByCategory } from '@/lib/utils'
import { CONDITION_OPTIONS } from '../constants'
import type { ListingFormValues } from '../types'

interface CategoryConditionFieldsProps {
  register: UseFormRegister<ListingFormValues>
  errors: FieldErrors<ListingFormValues>
  selectedCategory?: string
}

export default function CategoryConditionFields({
  register,
  errors,
  selectedCategory,
}: CategoryConditionFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category *
        </label>
        <select
          {...register('category', { required: 'Category is required' })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">Select a category</option>
          {listingCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {errors.category && (
          <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
        )}
        {selectedCategory && subcategoriesByCategory[selectedCategory]?.length > 0 && (
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory (optional)</label>
            <select
              {...register('subcategory')}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">None</option>
              {subcategoriesByCategory[selectedCategory].map((sub) => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Condition *
        </label>
        <select
          {...register('condition', { required: 'Condition is required' })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="">Select condition</option>
          {CONDITION_OPTIONS.map((condition) => (
            <option key={condition} value={condition}>{condition}</option>
          ))}
        </select>
        {errors.condition && (
          <p className="text-red-500 text-sm mt-1">{errors.condition.message}</p>
        )}
      </div>
    </div>
  )
}
