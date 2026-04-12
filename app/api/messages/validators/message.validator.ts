import { isValidObjectId } from 'mongoose'

const MAX_MESSAGE_LENGTH = 2000
const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 100
const MAX_PAGE_SIZE = 100

export interface GetMessagesQuery {
  conversationId?: string
  otherUserId?: string
  productId?: string
  page: number
  pageSize: number
}

export interface SendMessageInput {
  receiverId: string
  productId?: string
  content: string
}

function parsePositiveNumber(value: string | null, fallback: number): number {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.floor(parsed)
}

function sanitizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function validateGetMessagesQuery(url: string): { data?: GetMessagesQuery; error?: string } {
  const { searchParams } = new URL(url)

  const conversationId = searchParams.get('conversationId') ?? undefined
  const otherUserId = searchParams.get('otherUserId') ?? undefined
  const productId = searchParams.get('productId') ?? undefined
  const page = parsePositiveNumber(searchParams.get('page'), DEFAULT_PAGE)
  const pageSize = Math.min(parsePositiveNumber(searchParams.get('pageSize'), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE)

  if (otherUserId && !isValidObjectId(otherUserId)) {
    return { error: 'Invalid other user ID format' }
  }

  if (productId && !isValidObjectId(productId)) {
    return { error: 'Invalid product ID format' }
  }

  return {
    data: {
      conversationId,
      otherUserId,
      productId,
      page,
      pageSize,
    },
  }
}

export async function validateSendMessageInput(requestBody: unknown): Promise<{ data?: SendMessageInput; error?: string }> {
  if (!requestBody || typeof requestBody !== 'object') {
    return { error: 'Invalid request body' }
  }

  const payload = requestBody as Record<string, unknown>
  const receiverId = typeof payload.receiverId === 'string' ? payload.receiverId : ''
  const productId = typeof payload.productId === 'string' ? payload.productId : undefined
  const rawContent = typeof payload.content === 'string' ? payload.content : ''
  const content = sanitizeText(rawContent)

  if (!receiverId || !content) {
    return { error: 'Receiver ID and content are required' }
  }

  if (!isValidObjectId(receiverId)) {
    return { error: 'Invalid receiver ID format' }
  }

  if (productId && !isValidObjectId(productId)) {
    return { error: 'Invalid product ID format' }
  }

  if (content.length < 1 || content.length > MAX_MESSAGE_LENGTH) {
    return { error: 'Message must be between 1 and 2000 characters' }
  }

  return {
    data: {
      receiverId,
      productId,
      content,
    },
  }
}
