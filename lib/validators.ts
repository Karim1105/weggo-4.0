/**
 * Input validation utilities
 * Comprehensive validation for common data types
 */

export interface ValidationErrors {
  [field: string]: string
}

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
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' }
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
export function validatePhone(phone: string | undefined): { valid: boolean; message?: string } {
  if (!phone) return { valid: true } // Optional
  if (phone.length < 10) {
    return { valid: false, message: 'Phone must be at least 10 characters' }
  }
  if (!/^[\d\s\-\+\(\)]*$/.test(phone)) {
    return { valid: false, message: 'Phone contains invalid characters' }
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
