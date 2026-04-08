import { describe, it, expect } from 'vitest'
import { getNavbarSellHref, resolveNavbarRole } from '@/lib/ui/role-ui'

describe('navbar role resolution', () => {
  it('prefers authenticated user role over layout role', () => {
    expect(resolveNavbarRole('user', 'admin')).toBe('admin')
    expect(getNavbarSellHref('user', 'admin')).toBe('/admin')
  })

  it('uses layout role when user role is missing', () => {
    expect(resolveNavbarRole('admin', null)).toBe('admin')
    expect(getNavbarSellHref('admin', null)).toBe('/admin')
  })

  it('falls back to user sell button when no role is available', () => {
    expect(resolveNavbarRole(null, null)).toBeNull()
    expect(getNavbarSellHref(null, null)).toBe('/sell')
  })
})
