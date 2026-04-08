/**
 * Input validation utilities
 * Comprehensive validation for common data types
 */

export interface ValidationErrors {
  [field: string]: string
}

export const NATIONAL_ID_GENERIC_ERROR = 'Please enter a valid National ID number.'

/**
 * Email validation
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.toLowerCase())
}

/**
 * Password validation
 * Requires: at least 8 characters
 */
export function validatePassword(
  password: string
): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' }
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must include a lowercase letter' }
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must include an uppercase letter' }
  }

  if (!/\d/.test(password)) {
    return { valid: false, message: 'Password must include a number' }
  }

  if (!/[!@#$%^&*(),.?":{}|<>_\-\\[\]\/+=~`]/.test(password)) {
    return { valid: false, message: 'Password must include a special character' }
  }

  return { valid: true }
}

export function validateEgyptianNationalId(
  nationalId: string
): { valid: boolean; message?: string } {
  const cleaned = (nationalId || '').trim()

  // 1. Basic format
  if (!/^[23]\d{13}$/.test(cleaned)) {
    return { valid: false, message: NATIONAL_ID_GENERIC_ERROR }
  }

  // 2. Extract parts
  const century = cleaned[0] === '2' ? 1900 : 2000
  const year = parseInt(cleaned.slice(1, 3), 10)
  const month = parseInt(cleaned.slice(3, 5), 10)
  const day = parseInt(cleaned.slice(5, 7), 10)
  const governorate = cleaned.slice(7, 9)

  const fullYear = century + year

  // 3. Validate date
  const date = new Date(fullYear, month - 1, day)

  if (
    date.getFullYear() !== fullYear ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return { valid: false, message: NATIONAL_ID_GENERIC_ERROR }
  }

  // 4. Prevent future dates
  if (date > new Date()) {
    return { valid: false, message: NATIONAL_ID_GENERIC_ERROR }
  }

  // 5. Validate governorate code
  const validGovernorates = new Set([
    '01','02','03','04','11','12','13','14','15','16','17','18','19',
    '21','22','23','24','25','26','27','28','29','31','32','33','34','35','88'
  ])

  if (!validGovernorates.has(governorate)) {
    return { valid: false, message: NATIONAL_ID_GENERIC_ERROR }
  }

  const age = new Date().getFullYear() - fullYear
  if (age < 18) {
    return { valid: false, message: 'You must be at least 18 years old' }
  }

  return { valid: true }
}

/**
 * Name validation
 */
export function validateName(name: string): { valid: boolean; message?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, message: 'Name is required' }
  }
  if (name.trim().length < 2) {
    return { valid: false, message: 'Name must be at least 2 characters' }
  }
  if (name.trim().length > 100) {
    return { valid: false, message: 'Name must be less than 100 characters' }
  }
  return { valid: true }
}

/**
 * Phone validation (optional, but if provided must be valid)
 */
export function validatePhone(
  phone: string | undefined
): { valid: boolean; message?: string } {
  if (!phone) return { valid: true } // Optional

  // Normalize: remove spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '')

  // Convert +20 to local format
  let normalized = cleaned
  if (cleaned.startsWith('+20')) {
    normalized = '0' + cleaned.slice(3)
  } else if (cleaned.startsWith('20')) {
    normalized = '0' + cleaned.slice(2)
  }

  // Must be exactly 11 digits
  if (!/^01\d{9}$/.test(normalized)) {
    return { valid: false, message: 'Please enter a valid Egyptian phone number' }
  }

  // Must start with valid operator codes
  const validPrefixes = ['010', '011', '012', '015']
  if (!validPrefixes.some(prefix => normalized.startsWith(prefix))) {
    return { valid: false, message: 'Invalid phone operator' }
  }

  return { valid: true }
}

/**
 * Price validation
 */
export function validatePrice(price: number): { valid: boolean; message?: string } {
  if (isNaN(price)) {
    return { valid: false, message: 'Price must be a number' }
  }
  if (price < 0) {
    return { valid: false, message: 'Price cannot be negative' }
  }
  if (price > 99999999) {
    return { valid: false, message: 'Price is too high' }
  }
  return { valid: true }
}

/**
 * Title validation
 */
export function validateTitle(title: string): { valid: boolean; message?: string } {
  if (!title || title.trim().length === 0) {
    return { valid: false, message: 'Title is required' }
  }
  if (title.trim().length < 5) {
    return { valid: false, message: 'Title must be at least 5 characters' }
  }
  if (title.trim().length > 200) {
    return { valid: false, message: 'Title must be less than 200 characters' }
  }
  return { valid: true }
}

/**
 * Description validation
 */
export function validateDescription(description: string): { valid: boolean; message?: string } {
  if (!description || description.trim().length === 0) {
    return { valid: false, message: 'Description is required' }
  }
  if (description.trim().length < 10) {
    return { valid: false, message: 'Description must be at least 10 characters' }
  }
  if (description.trim().length > 5000) {
    return { valid: false, message: 'Description must be less than 5000 characters' }
  }
  return { valid: true }
}

/**
 * Location validation
 */
export function validateLocation(location: string): { valid: boolean; message?: string } {
  if (!location || location.trim().length === 0) {
    return { valid: false, message: 'Location is required' }
  }
  if (location.trim().length < 2) {
    return { valid: false, message: 'Location must be at least 2 characters' }
  }
  if (location.trim().length > 100) {
    return { valid: false, message: 'Location must be less than 100 characters' }
  }
  return { valid: true }
}

/**
 * Category validation
 */
export function validateCategory(category: string): { valid: boolean; message?: string } {
  const validCategories = [
    'electronics',
    'furniture',
    'vehicles',
    'fashion',
    'home',
    'sports',
    'books',
    'toys',
    'music',
    'gaming',
  ]
  if (!validCategories.includes(category)) {
    return { valid: false, message: 'Invalid category' }
  }
  return { valid: true }
}

/**
 * Condition validation
 */
export function normalizeCondition(condition: string): string {
  const normalized = condition?.toString().trim().toLowerCase()
  switch (normalized) {
    case 'new':
      return 'New'
    case 'like-new':
    case 'like new':
      return 'Like New'
    case 'excellent':
      return 'Excellent'
    case 'good':
      return 'Good'
    case 'fair':
      return 'Fair'
    case 'poor':
      return 'Poor'
    default:
      return condition?.toString().trim() || ''
  }
}

export function validateCondition(condition: string): { valid: boolean; message?: string } {
  const validConditions = ['New', 'Like New', 'Excellent', 'Good', 'Fair', 'Poor']
  const normalized = normalizeCondition(condition)
  if (!validConditions.includes(normalized)) {
    return { valid: false, message: 'Invalid condition' }
  }
  return { valid: true }
}

/**
 * Register form validation
 */
export function validateRegisterForm(data: {
  name?: string
  email?: string
  password?: string
  phone?: string
  location?: string
}): { valid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {}

  // Name validation
  const nameValidation = validateName(data.name || '')
  if (!nameValidation.valid) errors.name = nameValidation.message!

  // Email validation
  if (!data.email || !validateEmail(data.email)) {
    errors.email = 'Please provide a valid email address'
  }

  // Password validation
  const passwordValidation = validatePassword(data.password || '')
  if (!passwordValidation.valid) errors.password = passwordValidation.message!

  // Phone validation (optional)
  if (data.phone) {
    const phoneValidation = validatePhone(data.phone)
    if (!phoneValidation.valid) errors.phone = phoneValidation.message!
  }

  // Location validation (optional)
  if (data.location) {
    const locationValidation = validateLocation(data.location)
    if (!locationValidation.valid) errors.location = locationValidation.message!
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Create listing validation
 */
export function validateCreateListingForm(data: {
  title?: string
  description?: string
  price?: number
  category?: string
  condition?: string
  location?: string
}): { valid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {}

  // Title validation
  const titleValidation = validateTitle(data.title || '')
  if (!titleValidation.valid) errors.title = titleValidation.message!

  // Description validation
  const descriptionValidation = validateDescription(data.description || '')
  if (!descriptionValidation.valid) errors.description = descriptionValidation.message!

  // Price validation
  const priceValidation = validatePrice(data.price ?? NaN)
  if (!priceValidation.valid) errors.price = priceValidation.message!

  // Category validation
  const categoryValidation = validateCategory(data.category || '')
  if (!categoryValidation.valid) errors.category = categoryValidation.message!

  // Condition validation
  const conditionValidation = validateCondition(data.condition || '')
  if (!conditionValidation.valid) errors.condition = conditionValidation.message!

  // Location validation
  const locationValidation = validateLocation(data.location || '')
  if (!locationValidation.valid) errors.location = locationValidation.message!

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  }
}
