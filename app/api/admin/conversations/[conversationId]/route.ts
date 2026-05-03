import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { mapMessageDocToDTO } from '@/app/api/messages/utils/message.mapper'
import Message from '@/models/Message'

async function handler(
  request: NextRequest,
  admin: any,
  context: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await context.params
    if (!conversationId?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Conversation ID is required' },
        { status: 400 }
      )
    }

    await connectDB()

    const messages = await Message.find({ conversationId })
      .populate('sender', 'name email avatar banned')
      .populate('receiver', 'name email avatar banned')
      .populate('product', 'title price images')
      .sort({ createdAt: 1 })
      .lean()

    if (!messages.length) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const messageDtos = messages.map(mapMessageDocToDTO)
    const firstMessage = messageDtos[0]
    const participantMap = new Map<string, (typeof firstMessage.sender | typeof firstMessage.receiver)>()

    for (const message of messageDtos) {
      participantMap.set(message.sender.id, message.sender)
      participantMap.set(message.receiver.id, message.receiver)
    }

    return NextResponse.json({
      success: true,
      data: {
        conversation: {
          conversationId,
          participants: Array.from(participantMap.values()).map((participant) => ({
            _id: participant.id,
            name: participant.name,
            email: participant.email,
            avatar: participant.avatar,
            banned: participant.banned,
          })),
          product: firstMessage.product
            ? {
                _id: firstMessage.product.id,
                title: firstMessage.product.title,
                price: firstMessage.product.price,
                images: firstMessage.product.images,
                status: undefined,
              }
            : null,
          messages: messageDtos,
          total: messageDtos.length,
        },
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch conversation' },
      { status: 500 }
    )
  }
}

export const GET = requireAdmin(handler)
