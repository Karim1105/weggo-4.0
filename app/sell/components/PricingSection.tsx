import { memo } from 'react'
import { Sparkles } from 'lucide-react'
import type { FieldError, UseFormRegister } from 'react-hook-form'
import type { ListingFormValues } from '../types'

interface PricingSectionProps {
  register: UseFormRegister<ListingFormValues>
  priceError?: FieldError
  canOpenAISuggestion: boolean
  onOpenAISuggestion: () => void
}

function PricingSectionComponent({
  register,
  priceError,
  canOpenAISuggestion,
  onOpenAISuggestion,
}: PricingSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          Price (EGP) *
        </label>
        <button
          type="button"
          onClick={onOpenAISuggestion}
          className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
          disabled={!canOpenAISuggestion}
        >
          <Sparkles className="w-4 h-4" />
          Get AI Price Suggestion
        </button>
      </div>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <span className="text-gray-500">EGP</span>
        </div>
        <input
          {...register('price', { required: 'Price is required', min: 0 })}
          type="number"
          className="w-full pl-16 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="0.00"
        />
      </div>
      {priceError && (
        <p className="text-red-500 text-sm mt-1">{priceError.message}</p>
      )}
    </div>
  )
}

const PricingSection = memo(PricingSectionComponent)

export default PricingSection
