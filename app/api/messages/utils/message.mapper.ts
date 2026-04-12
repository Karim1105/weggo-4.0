import { Types } from 'mongoose'
import type { ConversationDTO, MessageDTO, ProductDTO, UserDTO } from '@/types/messages'

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function toIsoDate(value: unknown): string {
  const date = value instanceof Date ? value : new Date(String(value ?? ''))
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString()
}

function toId(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Types.ObjectId) return value.toString()
  if (value && typeof value === 'object' && 'toString' in value && typeof value.toString === 'function') {
    return value.toString()
  }
  return ''
}

function pickString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function pickNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function filterProductImages(imagesValue: unknown): string[] {
  if (!Array.isArray(imagesValue)) return []
  return imagesValue
    .filter((image): image is string => typeof image === 'string' && !image.startsWith('data:'))
    .slice(0, 1)
}

function mapUser(value: unknown): UserDTO {
  const record = toRecord(value)
  const id = toId(record._id ?? record.id)

  return {
    id,
    name: pickString(record.name) ?? 'User',
    email: pickString(record.email),
    avatar: pickString(record.avatar),
    banned: Boolean(record.banned),
  }
}

function mapProduct(value: unknown): ProductDTO | undefined {
  if (!value) return undefined
  const record = toRecord(value)
  const id = toId(record._id ?? record.id)
  if (!id) return undefined

  return {
    id,
    title: pickString(record.title) ?? '',
    price: pickNumber(record.price) ?? 0,
    images: filterProductImages(record.images),
  }
}

export function mapMessageDocToDTO(value: unknown): MessageDTO {
  const record = toRecord(value)

  return {
    id: toId(record._id ?? record.id),
    conversationId: pickString(record.conversationId) ?? '',
    content: pickString(record.content) ?? '',
    createdAt: toIsoDate(record.createdAt),
    receivedAt: record.receivedAt ? toIsoDate(record.receivedAt) : undefined,
    read: Boolean(record.read),
    readAt: record.readAt ? toIsoDate(record.readAt) : undefined,
    sender: mapUser(record.sender),
    receiver: mapUser(record.receiver),
    product: mapProduct(record.product),
  }
}

export function mapConversationDocToDTO(value: unknown): ConversationDTO {
  const record = toRecord(value)
  const conversationId = pickString(record.conversationId) ?? pickString(record._id) ?? ''

  return {
    conversationId,
    unreadCount: pickNumber(record.unreadCount) ?? 0,
    lastMessage: record.lastMessage ? mapMessageDocToDTO(record.lastMessage) : null,
  }
}

export function buildConversationId(currentUserId: string, receiverId: string, productId?: string): string {
  const userIds = [currentUserId, receiverId].sort()
  return `${userIds[0]}_${userIds[1]}${productId ? `_${productId}` : ''}`
}
