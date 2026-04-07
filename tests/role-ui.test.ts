import { describe, expect, it } from 'vitest'
import {
  getProductCardActionVariant,
  getSellDashboardHref,
  isAdminRole,
} from '@/lib/ui/role-ui'

describe('role-ui helpers', () => {
  it('maps admin role to dashboard route', () => {
    expect(getSellDashboardHref('admin')).toBe('/admin')
    expect(isAdminRole('admin')).toBe(true)
  })

  it('maps user and unauthenticated roles to sell route', () => {
    expect(getSellDashboardHref('user')).toBe('/sell')
    expect(getSellDashboardHref(null)).toBe('/sell')
    expect(getSellDashboardHref(undefined)).toBe('/sell')
    expect(isAdminRole('user')).toBe(false)
  })

  it('maps product card action variant from admin flag', () => {
    expect(getProductCardActionVariant(true)).toBe('admin-menu')
    expect(getProductCardActionVariant(false)).toBe('favorite')
  })
})
