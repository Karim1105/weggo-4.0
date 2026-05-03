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

export const ADMIN_TAB_KEYS: AdminTabKey[] = [
  'overview',
  'users',
  'reports',
  'appeals',
  'tickets',
  'listings',
  'categories',
  'activity',
]

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
  actionTaken?: string
  listing?: {
    _id?: string
    title?: string
    images?: string[]
    status?: string
    price?: number
    location?: string
    seller?: {
      _id?: string
      name?: string
      email?: string
    }
  }
  reporter?: {
    _id?: string
    name?: string
    email?: string
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
    _id?: string
    name?: string
    email?: string
    banned?: boolean
    bannedAt?: string
    bannedReason?: string
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

export interface AdminUserConversation {
  conversationId: string
  otherUser?: {
    _id?: string
    name?: string
    avatar?: string
    role?: string
  } | null
  product?: {
    _id?: string
    title?: string
    price?: number
    images?: string[]
    status?: string
  } | null
  messageCount: number
  unreadCount: number
  lastMessageTime: string
  recentMessages: Array<{
    _id: string
    content?: string
    createdAt: string
    sender?: {
      _id?: string
      name?: string
      avatar?: string
    }
    receiver?: {
      _id?: string
      name?: string
      avatar?: string
    }
  }>
}

export interface AdminConversationDetailPayload {
  conversation: {
    conversationId: string
    participants: Array<{
      _id?: string
      name?: string
      email?: string
      avatar?: string
      banned?: boolean
    }>
    product?: {
      _id?: string
      title?: string
      price?: number
      images?: string[]
      status?: string
    } | null
    messages: Array<{
      id: string
      conversationId: string
      content: string
      createdAt: string
      receivedAt?: string
      read: boolean
      readAt?: string
      sender: {
        id: string
        name: string
        email?: string
        avatar?: string
        banned: boolean
      }
      receiver: {
        id: string
        name: string
        email?: string
        avatar?: string
        banned: boolean
      }
      product?: {
        id: string
        title: string
        price: number
        images: string[]
      }
    }>
    total: number
  }
}

export interface AdminUserChatsPayload {
  user: {
    id: string
    name: string
    email: string
    role: string
    banned: boolean
  }
  conversations: AdminUserConversation[]
  pagination: PaginationMeta
}

export interface AdminUserListingsPayload {
  seller: {
    id: string
    name: string
    email: string
    role: string
    sellerVerified: boolean
    banned: boolean
    averageRating?: number
    ratingCount?: number
    totalSales?: number
  }
  listings: SellerListing[]
  statistics: {
    total: number
    active: number
    sold: number
    pending: number
    deleted: number
    totalViews: number
  }
  recentReviews: Array<{
    _id: string
    rating: number
    comment?: string
    createdAt: string
    reviewer?: {
      name?: string
      avatar?: string
    }
  }>
  pagination: PaginationMeta
}

export interface AdminReportDetailPayload {
  report: AdminReport & {
    description?: string
    reviewedAt?: string
    reviewedBy?: {
      _id?: string
      name?: string
    }
  }
}

export interface AdminAppealDetailPayload {
  appeal: AdminAppeal & {
    reviewedAt?: string
    reviewedBy?: {
      _id?: string
      name?: string
    }
    bannedBy?: {
      _id?: string
      name?: string
    }
  }
}

export interface SellerListingsPayload {
  seller: {
    _id: string
    name: string
    email: string
    sellerVerified?: boolean
    banned?: boolean
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
