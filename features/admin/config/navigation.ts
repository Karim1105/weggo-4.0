import { Activity, BarChart3, Flag, LifeBuoy, Package, ShieldAlert, Tags, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AdminNavItem, AdminTabKey } from '@/features/admin/types'

export interface AdminNavConfigItem extends AdminNavItem {
  icon: LucideIcon
}

export const ADMIN_NAV_ITEMS: AdminNavConfigItem[] = [
  {
    key: 'overview',
    label: 'Overview',
    description: 'Analytics and KPIs',
    icon: BarChart3,
    roles: ['admin', 'moderator'],
  },
  {
    key: 'users',
    label: 'Users',
    description: 'Manage user access',
    icon: Users,
    roles: ['admin'],
  },
  {
    key: 'reports',
    label: 'Reports',
    description: 'Moderation queue',
    icon: Flag,
    roles: ['admin', 'moderator'],
  },
  {
    key: 'appeals',
    label: 'Appeals',
    description: 'Ban appeal decisions',
    icon: ShieldAlert,
    roles: ['admin'],
  },
  {
    key: 'tickets',
    label: 'Tickets',
    description: 'Support inbox',
    icon: LifeBuoy,
    roles: ['admin'],
  },
  {
    key: 'listings',
    label: 'Listings',
    description: 'Seller listing controls',
    icon: Package,
    roles: ['admin'],
  },
  {
    key: 'categories',
    label: 'Categories',
    description: 'Category health',
    icon: Tags,
    roles: ['admin', 'moderator'],
  },
  {
    key: 'activity',
    label: 'Activity',
    description: 'Action audit trail',
    icon: Activity,
    roles: ['admin', 'moderator'],
  },
]

export const TAB_TITLES: Record<AdminTabKey, string> = {
  overview: 'Dashboard overview',
  users: 'User management',
  reports: 'Reports moderation',
  appeals: 'Appeals review',
  tickets: 'Support tickets',
  listings: 'Listings management',
  categories: 'Categories management',
  activity: 'Activity logs',
}

export const TAB_SUBTITLES: Record<AdminTabKey, string> = {
  overview: 'Track users, listings, and marketplace performance.',
  users: 'Search, review, and control user access securely.',
  reports: 'Review reports and apply moderation actions.',
  appeals: 'Approve or reject user ban appeals.',
  tickets: 'Manage user support conversations and ticket status.',
  listings: 'Manage seller visibility and boosts.',
  categories: 'Review category distribution and discover gaps.',
  activity: 'Recent admin actions and notifications.',
}
