export type UserRole = 'user' | 'admin' | null | undefined

export function isAdminRole(role: UserRole): boolean {
  return role === 'admin'
}

export function getSellDashboardHref(role: UserRole): '/admin' | '/sell' {
  return isAdminRole(role) ? '/admin' : '/sell'
}

export function getProductCardActionVariant(isAdmin: boolean): 'admin-menu' | 'favorite' {
  return isAdmin ? 'admin-menu' : 'favorite'
}
