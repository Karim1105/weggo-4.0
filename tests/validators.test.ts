import { describe, it, expect } from 'vitest'
import {
  validateEmail,
  validatePassword,
  validatePrice,
  validateTitle,
  validateDescription,
  validateCategory,
  validateCondition,
  normalizeCondition,
} from '@/lib/validators'

describe('validators', () => {
  it('validates email', () => {
    expect(validateEmail('test@example.com')).toBe(true)
    expect(validateEmail('bad-email')).toBe(false)
  })

  it('validates password rules', () => {
    expect(validatePassword('Aa123456').valid).toBe(true)
    expect(validatePassword('short').valid).toBe(false)
  })

  it('validates price bounds', () => {
    expect(validatePrice(0).valid).toBe(true)
    expect(validatePrice(-1).valid).toBe(false)
  })

  it('validates title and description length', () => {
    expect(validateTitle('Valid title').valid).toBe(true)
    expect(validateTitle('Bad').valid).toBe(false)
    expect(validateDescription('This is a valid description.').valid).toBe(true)
    expect(validateDescription('short').valid).toBe(false)
  })

  it('validates category list', () => {
    expect(validateCategory('electronics').valid).toBe(true)
    expect(validateCategory('invalid').valid).toBe(false)
  })

  it('normalizes and validates condition', () => {
    expect(normalizeCondition('like-new')).toBe('Like New')
    expect(normalizeCondition('Poor')).toBe('Poor')
    expect(validateCondition('like-new').valid).toBe(true)
  })
})
