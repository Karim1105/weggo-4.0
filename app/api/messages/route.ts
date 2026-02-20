import { NextRequest, NextResponse } from 'next/server'
import { isValidObjectId } from 'mongoose'
import connectDB from '@/lib/db'
import Message from '@/models/Message'
import Product from '@/models/Product'
import User from '@/models/User'
import { requireAuthNotBanned } from '@/lib/auth'

async function handler(request: NextRequest, user: any) {
  try {
    await connectDB()

    if (request.method === 'GET') {
      const { searchParams } = new URL(request.url)
      const conversationId = searchParams.get('conversationId')
      const otherUserId = searchParams.get('otherUserId')
      const productId = searchParams.get('productId')

      if (otherUserId && !isValidObjectId(otherUserId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid other user ID format' },
          { status: 400 }
        )
      }

      if (productId && !isValidObjectId(productId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid product ID format' },
          { status: 400 }
        )
      }

      if (conversationId) {
        // Validate that user is a participant in the conversation (either sender or receiver)
        const isParticipant = await Message.exists({
          conversationId,
          $or: [{ sender: user._id }, { receiver: user._id }]
        })

        if (!isParticipant) {
          return NextResponse.json(
            { success: false, error: 'Access denied to this conversation' },
            { status: 403 }
          )
        }

        // Get messages for a specific conversation
        const messages = await Message.find({ conversationId })
          .populate('sender', 'name email avatar')
          .populate('receiver', 'name email avatar')
          .populate('product', 'title price images')
          .sort({ createdAt: 1 })
          .lean()

        // Mark as read
        await Message.updateMany(
          { conversationId, receiver: user._id, read: false },
          { read: true }
        )

        return NextResponse.json({
          success: true,
          messages,
        })
      }

      // Get all conversations for user
      const conversations = await Message.aggregate([
        {
          $match: {
            $or: [{ sender: user._id }, { receiver: user._id }],
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $group: {
            _id: '$conversationId',
            lastMessage: { $first: '$$ROOT' },
            unreadCount: {
              $sum: {
                $cond: [{ $eq: ['$receiver', user._id] }, { $cond: ['$read', 0, 1] }, 0],
              },
            },
          },
        },
      ])

      const conversationIds = conversations.map((c) => c._id)
      const messages = await Message.find({ conversationId: { $in: conversationIds } })
        .populate('sender', 'name email avatar')
        .populate('receiver', 'name email avatar')
        .populate('product', 'title price images')
        .sort({ createdAt: -1 })
        .lean()

      return NextResponse.json({
        success: true,
        conversations: conversations.map((conv) => ({
          conversationId: conv._id,
          lastMessage: messages.find((m) => m.conversationId === conv._id),
          unreadCount: conv.unreadCount,
        })),
      })
    }

    if (request.method === 'POST') {
      const body = await request.json()
      const { receiverId, productId, content } = body

      if (!receiverId || !content) {
        return NextResponse.json(
          { success: false, error: 'Receiver ID and content are required' },
          { status: 400 }
        )
      }

      // Validate receiverId is a valid ObjectId
      if (!isValidObjectId(receiverId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid receiver ID format' },
          { status: 400 }
        )
      }

      // Validate productId if provided
      if (productId && !isValidObjectId(productId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid product ID format' },
          { status: 400 }
        )
      }

      // Basic validation / anti-spam
      if (typeof content !== 'string' || content.trim().length < 1 || content.trim().length > 2000) {
        return NextResponse.json(
          { success: false, error: 'Message must be between 1 and 2000 characters' },
          { status: 400 }
        )
      }

      // Blocking checks (both directions)
      const [me, other] = await Promise.all([
        User.findById(user._id).select('blockedUsers').lean(),
        User.findById(receiverId).select('blockedUsers banned').lean(),
      ])

      if (!other) {
        return NextResponse.json(
          { success: false, error: 'Receiver not found' },
          { status: 404 }
        )
      }

      if ((other as any).banned) {
        return NextResponse.json(
          { success: false, error: 'User is not available' },
          { status: 403 }
        )
      }

      const myBlocked = new Set(((me as any)?.blockedUsers || []).map((id: any) => id.toString()))
      const theirBlocked = new Set(((other as any)?.blockedUsers || []).map((id: any) => id.toString()))
      if (myBlocked.has(receiverId.toString()) || theirBlocked.has(user._id.toString())) {
        return NextResponse.json(
          { success: false, error: 'You cannot message this user' },
          { status: 403 }
        )
      }

      // Prevent repeated identical messages within a short window
      const recentDuplicate = await Message.findOne({
        sender: user._id,
        receiver: receiverId,
        product: productId || null,
        content: content.trim(),
        createdAt: { $gte: new Date(Date.now() - 30 * 1000) },
      }).lean()
      if (recentDuplicate) {
        return NextResponse.json(
          { success: false, error: 'Please wait a moment before sending the same message again.' },
          { status: 429 }
        )
      }

      // Generate conversation ID (sorted to ensure consistency)
      const userIds = [user._id.toString(), receiverId].sort()
      const conversationId = `${userIds[0]}_${userIds[1]}${productId ? `_${productId}` : ''}`

      try {
        // Create the message
        const message = await Message.create({
          conversationId,
          sender: user._id,
          receiver: receiverId,
          product: productId || null,
          content: content.trim(),
        })

        // If messaging about a specific product, mark product as "inquired" by updating status
        if (productId) {
          await Product.updateOne(
            { _id: productId },
            { $set: { lastInquiry: new Date() } }
          )
        }

        // Populate the message before returning
        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'name email avatar')
          .populate('receiver', 'name email avatar')
          .populate('product', 'title price images')

        return NextResponse.json({
          success: true,
          message: populatedMessage,
        })
      } catch (error: any) {
        console.error('Message creation error:', error)
        const message = process.env.NODE_ENV === 'production'
          ? 'Failed to send message. Please try again.'
          : error.message || 'Failed to send message. Please try again.'
        return NextResponse.json(
          { success: false, error: message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'Method not allowed' },
      { status: 405 }
    )
  } catch (error: any) {
    const message = process.env.NODE_ENV === 'production'
      ? 'Request failed'
      : error.message || 'Request failed'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

export const GET = requireAuthNotBanned(handler)
export const POST = requireAuthNotBanned(handler)

