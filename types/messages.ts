export interface UserDTO {
  id: string
  name: string
  email?: string
  avatar?: string
  banned?: boolean
}

export interface ProductDTO {
  id: string
  title: string
  price: number
  images: string[]
}

export interface MessageDTO {
  id: string
  conversationId: string
  content: string
  createdAt: string
  receivedAt?: string
  read: boolean
  readAt?: string
  sender: UserDTO
  receiver: UserDTO
  product?: ProductDTO
}

export interface ConversationDTO {
  conversationId: string
  lastMessage: MessageDTO | null
  unreadCount: number
}

export interface PaginationMeta {
  cursor?: string | null
  limit?: number
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

export interface ConversationsResponseDTO {
  success: true
  conversations: ConversationDTO[]
  totalUnread: number
  pagination: PaginationMeta
}

export interface MessagesResponseDTO {
  success: true
  messages: MessageDTO[]
  pagination: PaginationMeta
}
