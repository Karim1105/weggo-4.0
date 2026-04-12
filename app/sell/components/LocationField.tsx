import type { FieldError, UseFormRegister } from 'react-hook-form'
import { LOCATION_OPTIONS } from '../constants'
import type { ListingFormValues } from '../types'

interface LocationFieldProps {
  register: UseFormRegister<ListingFormValues>
  error?: FieldError
}

export default function LocationField({ register, error }: LocationFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Location *
      </label>
      <select
        {...register('location', { required: 'Location is required' })}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      >
        <option value="">Select your city</option>
        {LOCATION_OPTIONS.map((location) => (
          <option key={location.value} value={location.value}>{location.label}</option>
        ))}
      </select>
      {error && (
        <p className="text-red-500 text-sm mt-1">{error.message}</p>
      )}
    </div>
  )
}
