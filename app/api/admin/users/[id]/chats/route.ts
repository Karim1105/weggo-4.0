import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import Message from '@/models/Message'
import User from '@/models/User'
import Product from '@/models/Product'
import { requireAdmin } from '@/lib/auth'
import { logger, getRequestId } from '@/lib/logger'

// GET /api/admin/users/[id]/chats - Get all chats for a user
async function handler(
  request: NextRequest,
  admin: any,
  context: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId(request)

  try {
    const { id: userId } = await context.params
    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const rawMessageLimit = parseInt(searchParams.get('messageLimit') || '10')
    const messageLimit = Math.min(Math.max(Number.isNaN(rawMessageLimit) ? 10 : rawMessageLimit, 1), 20)

    const skip = (page - 1) * limit

    // Verify user exists
    const user = await User.findById(userId).select('name email role banned')
    if (!user) {
      logger.warn('Get user chats - user not found', { userId, adminId: admin._id }, requestId)
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Get all unique conversations for this user
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: user._id }, { receiver: user._id }],
        },
      },
      {
        $group: {
          _id: '$conversationId',
          otherUserId: {
            $first: {
              $cond: [{ $eq: ['$sender', user._id] }, '$receiver', '$sender'],
            },
          },
          productId: { $first: '$product' },
          lastMessageTime: { $max: '$createdAt' },
          messageCount: { $sum: 1 },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver', user._id] },
                    { $eq: ['$read', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { lastMessageTime: -1 } },
      { $skip: skip },
      { $limit: limit },
    ])

    // Populate user and product details
    const populatedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const [otherUser, product, messages] = await Promise.all([
          User.findById(conv.otherUserId).select('name avatar role').lean(),
          conv.productId ? Product.findById(conv.productId).select('title price images status').lean() : null,
          Message.find({ conversationId: conv._id })
            .populate('sender', 'name avatar')
            .populate('receiver', 'name avatar')
            .sort({ createdAt: -1 })
            .limit(messageLimit)
            .lean(),
        ])

        const sanitizedProduct = product
          ? {
              ...product,
              images: Array.isArray((product as any).images)
                ? (product as any).images
                    .filter((img: string) => typeof img === 'string' && !img.startsWith('data:'))
                    .slice(0, 1)
                : [],
            }
          : null

        const sanitizedMessages = messages.map((message: any) => ({
          ...message,
          product: message.product
            ? {
                ...message.product,
                images: Array.isArray(message.product.images)
                  ? message.product.images
                      .filter((img: string) => typeof img === 'string' && !img.startsWith('data:'))
                      .slice(0, 1)
                  : [],
              }
            : message.product,
        }))

        return {
          conversationId: conv._id,
          otherUser,
          product: sanitizedProduct,
          messageCount: conv.messageCount,
          unreadCount: conv.unreadCount,
          lastMessageTime: conv.lastMessageTime,
          recentMessages: sanitizedMessages.reverse(),
        }
      })
    )

    // Get total conversation count
    const totalConversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: user._id }, { receiver: user._id }],
        },
      },
      {
        $group: {
          _id: '$conversationId',
        },
      },
      {
        $count: 'total',
      },
    ])

    const total = totalConversations[0]?.total || 0

    logger.info(
      'Fetched user chats',
      { userId, conversationCount: populatedConversations.length, adminId: admin._id },
      requestId
    )

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          banned: user.banned,
        },
        conversations: populatedConversations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error: any) {
    logger.error('Get user chats error', error, { endpoint: '/api/admin/users/[id]/chats' }, requestId)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch user chats' },
      { status: 500 }
    )
  }
}

export const GET = requireAdmin(handler)
