import { NextRequest, NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { requireAuthNotBanned } from '@/lib/auth'
import { IUser } from '@/models/User'
import {
  getConversationMessages,
  getUserConversations,
  MessageServiceError,
  sendMessage,
} from '@/app/api/messages/services/message.service'
import {
  validateGetMessagesQuery,
  validateSendMessageInput,
} from '@/app/api/messages/validators/message.validator'

function getUserObjectId(user: IUser): Types.ObjectId {
  return user._id instanceof Types.ObjectId ? user._id : new Types.ObjectId(user._id)
}

async function handler(request: NextRequest, user: IUser) {
  try {
    if (request.method === 'GET') {
      const validation = validateGetMessagesQuery(request.url)
      if (!validation.data) {
        return NextResponse.json(
          { success: false, error: validation.error || 'Invalid query parameters' },
          { status: 400 }
        )
      }

      const userId = getUserObjectId(user)
      const { conversationId, page, pageSize } = validation.data

      if (conversationId) {
        const result = await getConversationMessages({
          conversationId,
          userId,
          page,
          pageSize,
        })

        return NextResponse.json({
          success: true,
          messages: result.messages,
          pagination: result.pagination,
          markedReadCount: result.markedReadCount,
        })
      }

      const result = await getUserConversations({
        userId,
        page,
        pageSize,
      })

      return NextResponse.json({
        success: true,
        conversations: result.conversations,
        totalUnread: result.totalUnread,
        pagination: result.pagination,
      })
    }

    if (request.method === 'POST') {
      const body = (await request.json()) as unknown
      const validation = await validateSendMessageInput(body)
      if (!validation.data) {
        return NextResponse.json(
          { success: false, error: validation.error || 'Invalid payload' },
          { status: 400 }
        )
      }

      try {
        const message = await sendMessage({
          payload: validation.data,
          userId: getUserObjectId(user),
        })

        return NextResponse.json({
          success: true,
          message,
        })
      } catch (error) {
        const serviceError = error as MessageServiceError
        const status = typeof serviceError.status === 'number' ? serviceError.status : 500
        const message =
          process.env.NODE_ENV === 'production'
            ? status >= 500
              ? 'Failed to send message. Please try again.'
              : serviceError.message
            : serviceError.message || 'Failed to send message. Please try again.'
        return NextResponse.json(
          { success: false, error: message },
          { status }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'Method not allowed' },
      { status: 405 }
    )
  } catch (error) {
    const serviceError = error as MessageServiceError
    const status = typeof serviceError.status === 'number' ? serviceError.status : 500
    const message = process.env.NODE_ENV === 'production'
      ? status >= 500
        ? 'Request failed'
        : serviceError.message
      : serviceError.message || 'Request failed'
    return NextResponse.json(
      { success: false, error: message },
      { status }
    )
  }
}

export const GET = requireAuthNotBanned(handler)
export const POST = requireAuthNotBanned(handler)
