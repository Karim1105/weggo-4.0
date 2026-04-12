import { LOCATIONS } from '@/lib/locations'

export const MAX_IMAGE_DIMENSION = 1920
export const IMAGE_QUALITY = 0.82
export const AI_CONFIDENCE_THRESHOLD = 0.3
export const AI_TITLE_MIN_LENGTH = 5
export const AI_DESCRIPTION_MIN_LENGTH = 10
export const AI_DEBOUNCE_MS = 350

export const CONDITION_OPTIONS = ['New', 'Like New', 'Excellent', 'Good', 'Fair'] as const

export const LOCATION_OPTIONS = LOCATIONS
