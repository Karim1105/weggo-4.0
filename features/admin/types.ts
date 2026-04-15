export type AdminRole = 'admin'

export type AdminTabKey =
  | 'overview'
  | 'users'
  | 'reports'
  | 'appeals'
  | 'tickets'
  | 'listings'
  | 'categories'
  | 'activity'

export interface AdminNavItem {
  key: AdminTabKey
  label: string
  description: string
  roles: AdminRole[]
}

export interface ApiSuccessResponse<T> {
  success: true
  data: T
}

export interface ApiErrorResponse {
  success: false
  error: string
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  pages: number
}

export interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  sellerVerified: boolean
  banned: boolean
  createdAt: string
  bannedReason?: string
}

export interface UsersPayload {
  users: AdminUser[]
  pagination: PaginationMeta
}

export interface AdminReport {
  _id: string
  reason: string
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
  createdAt: string
  listing?: {
    _id?: string
    title?: string
    images?: string[]
  }
  reporter?: {
    name?: string
  }
}

export interface ReportsPayload {
  reports: AdminReport[]
  pagination: PaginationMeta
}

export interface AdminAppeal {
  _id: string
  status: 'pending' | 'approved' | 'rejected'
  reason: string
  appealMessage: string
  rejectionReason?: string
  createdAt: string
  userId?: {
    name?: string
    email?: string
  }
}

export interface AppealsPayload {
  appeals: AdminAppeal[]
  pagination: PaginationMeta
}

export interface AdminSeller {
  _id: string
  name: string
  email: string
  banned: boolean
  listingCount: number
}

export interface SellersPayload {
  sellers: AdminSeller[]
  pagination: PaginationMeta
}

export interface SellerListing {
  _id: string
  title: string
  status: string
  price: number
  images: string[]
  isBoosted?: boolean
  createdAt: string
}

export interface SellerListingsPayload {
  seller: {
    _id: string
    name: string
    email: string
  }
  listings: SellerListing[]
  pagination: PaginationMeta
}

export interface AnalyticsOverview {
  totalUsers: number
  activeProducts: number
  pendingReports: number
  bannedUsers: number
  soldProducts: number
  boostedListings: number
}

export interface AnalyticsTrendPoint {
  _id: string
  count: number
}

export interface AnalyticsPayload {
  overview: AnalyticsOverview
  topCategories: Array<{ _id: string; count: number }>
  trends: {
    usersByDay: AnalyticsTrendPoint[]
    productsByDay: AnalyticsTrendPoint[]
  }
}

export interface AdminNotification {
  id: string
  title: string
  message: string
  createdAt: string
  read: boolean
}

export interface ActivityLog {
  id: string
  action: string
  details: string
  createdAt: string
  actor: string
}
