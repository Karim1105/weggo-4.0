export const MAX_IMAGE_DIMENSION = 1920
export const IMAGE_QUALITY = 0.82
export const AI_CONFIDENCE_THRESHOLD = 0.3
export const AI_TITLE_MIN_LENGTH = 5
export const AI_DESCRIPTION_MIN_LENGTH = 10
export const AI_DEBOUNCE_MS = 350

export const CONDITION_OPTIONS = ['New', 'Like New', 'Excellent', 'Good', 'Fair'] as const

export const LOCATION_OPTIONS = [
  { value: 'cairo', label: 'Cairo' },
  { value: 'giza', label: 'Giza' },
  { value: 'alexandria', label: 'Alexandria' },
  { value: 'sharm-el-sheikh', label: 'Sharm El Sheikh' },
  { value: 'hurghada', label: 'Hurghada' },
  { value: 'luxor', label: 'Luxor' },
  { value: 'aswan', label: 'Aswan' },
  { value: 'port-said', label: 'Port Said' },
  { value: 'suez', label: 'Suez' },
  { value: 'mansoura', label: 'Mansoura' },
] as const
