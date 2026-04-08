export type UserRole = 'user' | 'admin' | null | undefined

export function isAdminRole(role: UserRole): boolean {
  return role === 'admin'
}

export function getSellDashboardHref(role: UserRole): '/admin' | '/sell' {
  return isAdminRole(role) ? '/admin' : '/sell'
}

export function resolveNavbarRole(layoutRole: UserRole, userRole: UserRole): UserRole {
  return userRole ?? layoutRole ?? null
}

export function getNavbarSellHref(layoutRole: UserRole, userRole: UserRole): '/admin' | '/sell' {
  return getSellDashboardHref(resolveNavbarRole(layoutRole, userRole))
}

export function getProductCardActionVariant(isAdmin: boolean): 'admin-menu' | 'favorite' {
  return isAdmin ? 'admin-menu' : 'favorite'
}
