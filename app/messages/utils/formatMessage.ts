import type { MessageDTO } from '@/types/messages'

export interface FormattedConversationMessage {
  isSender: boolean
  otherUserName: string
  otherUserBanned: boolean
  timeLabel: string
  preview: string
  productTitle?: string
  productPrice?: number
  imageUrl?: string
}

export function getImageUrl(path: string | undefined): string | undefined {
  if (!path) return undefined
  if (path.startsWith('http') || path.startsWith('data:')) return path
  if (path.startsWith('/uploads/')) return `/api${path}`
  return path
}

export function formatMessage(message: MessageDTO, currentUserId: string | null): FormattedConversationMessage {
  const isSender = message.sender.id === currentUserId
  const otherUser = isSender ? message.receiver : message.sender
  const created = new Date(message.createdAt)

  return {
    isSender,
    otherUserName: otherUser.name || otherUser.email || 'User',
    otherUserBanned: Boolean(otherUser.banned),
    timeLabel: Number.isNaN(created.getTime()) ? '' : created.toLocaleString(),
    preview: `${isSender ? 'You: ' : ''}${message.content}`,
    productTitle: message.product?.title,
    productPrice: message.product?.price,
    imageUrl: getImageUrl(message.product?.images?.[0]),
  }
}
