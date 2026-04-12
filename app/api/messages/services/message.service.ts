import { Types } from 'mongoose'
import connectDB from '@/lib/db'
import type { ConversationDTO, MessageDTO, PaginationMeta } from '@/types/messages'
import type { SendMessageInput } from '@/app/api/messages/validators/message.validator'
import {
  buildConversationId,
  mapConversationDocToDTO,
  mapMessageDocToDTO,
} from '@/app/api/messages/utils/message.mapper'
import {
  createMessage,
  findConversationMessagesByCursor,
  findConversationMessages,
  findMessageById,
  findMessagingUser,
  findProductForMessaging,
  findRecentDuplicateMessage,
  findUserConversations,
  isConversationParticipant,
  markConversationRead,
  touchProductInquiry,
} from '@/app/api/messages/repositories/message.repository'

const DUPLICATE_WINDOW_MS = 30 * 1000

export class MessageServiceError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

function toPaginationMeta(page: number, pageSize: number, total: number): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    hasMore: page * pageSize < total,
  }
}

function toStringId(value: Types.ObjectId | string): string {
  return typeof value === 'string' ? value : value.toString()
}

export async function getUserConversations(params: {
  userId: Types.ObjectId
  page: number
  pageSize: number
}): Promise<{ conversations: ConversationDTO[]; totalUnread: number; pagination: PaginationMeta }> {
  await connectDB()

  const result = await findUserConversations(params.userId, {
    page: params.page,
    pageSize: params.pageSize,
  })

  return {
    conversations: result.conversations.map(mapConversationDocToDTO),
    totalUnread: result.totalUnread,
    pagination: toPaginationMeta(params.page, params.pageSize, result.total),
  }
}

export async function getConversationMessages(params: {
  conversationId: string
  userId: Types.ObjectId
  cursor?: string
  limit?: number
  page: number
  pageSize: number
}): Promise<{ messages: MessageDTO[]; pagination: PaginationMeta; markedReadCount: number }> {
  await connectDB()

  const participant = await isConversationParticipant(params.conversationId, params.userId)
  if (!participant) {
    throw new MessageServiceError('Access denied to this conversation', 403)
  }

  const markedReadCount = await markConversationRead(params.conversationId, params.userId)

  const limit = params.limit || params.pageSize
  const useCursor = Boolean(params.cursor) || !params.page || params.page <= 1

  if (useCursor) {
    const result = await findConversationMessagesByCursor(params.conversationId, {
      cursor: params.cursor,
      limit,
    })

    return {
      messages: result.messages.map(mapMessageDocToDTO).reverse(),
      markedReadCount,
      pagination: {
        page: params.page,
        pageSize: limit,
        limit,
        cursor: result.nextCursor,
        total: result.total,
        hasMore: Boolean(result.nextCursor),
      },
    }
  }

  const result = await findConversationMessages(params.conversationId, {
    page: params.page,
    pageSize: params.pageSize,
  })

  return {
    messages: result.messages.map(mapMessageDocToDTO),
    markedReadCount,
    pagination: toPaginationMeta(params.page, params.pageSize, result.total),
  }
}

export async function sendMessage(params: {
  payload: SendMessageInput
  userId: Types.ObjectId
}): Promise<MessageDTO> {
  await connectDB()

  const senderId = params.userId
  const senderIdString = toStringId(senderId)
  const receiverId = params.payload.receiverId

  if (receiverId === senderIdString) {
    throw new MessageServiceError('You cannot message yourself', 400)
  }

  const [me, other] = await Promise.all([
    findMessagingUser(senderIdString),
    findMessagingUser(receiverId),
  ])

  if (!other) {
    throw new MessageServiceError('Receiver not found', 404)
  }

  if (other.banned) {
    throw new MessageServiceError('User is not available', 403)
  }

  const myBlocked = new Set((me?.blockedUsers ?? []).map((id) => id.toString()))
  const theirBlocked = new Set((other.blockedUsers ?? []).map((id) => id.toString()))

  if (myBlocked.has(receiverId) || theirBlocked.has(senderIdString)) {
    throw new MessageServiceError('You cannot message this user', 403)
  }

  if (params.payload.productId) {
    const product = await findProductForMessaging(params.payload.productId)

    if (!product) {
      throw new MessageServiceError('Product not found', 404)
    }

    if (product.status !== 'active') {
      throw new MessageServiceError('This listing is not available for messaging', 400)
    }

    const sellerIsParticipant =
      product.sellerId === senderIdString || product.sellerId === receiverId

    if (!sellerIsParticipant) {
      throw new MessageServiceError('Invalid product for this conversation', 400)
    }
  }

  const duplicate = await findRecentDuplicateMessage({
    senderId,
    receiverId,
    productId: params.payload.productId,
    content: params.payload.content,
    windowMs: DUPLICATE_WINDOW_MS,
  })

  if (duplicate) {
    throw new MessageServiceError('Please wait a moment before sending the same message again.', 429)
  }

  const conversationId = buildConversationId(senderIdString, receiverId, params.payload.productId)

  const messageId = await createMessage({
    conversationId,
    senderId,
    receiverId,
    productId: params.payload.productId,
    content: params.payload.content,
  })

  if (params.payload.productId) {
    await touchProductInquiry(params.payload.productId)
  }

  const populatedMessage = await findMessageById(messageId)
  if (!populatedMessage) {
    throw new MessageServiceError('Failed to send message. Please try again.', 500)
  }

  return mapMessageDocToDTO(populatedMessage)
}
