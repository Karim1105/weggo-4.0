import { Types, type PipelineStage } from 'mongoose'
import Message from '@/models/Message'
import Product from '@/models/Product'
import User from '@/models/User'

interface PaginationInput {
  page: number
  pageSize: number
}

export interface ConversationAggregateResult {
  conversationId: string
  unreadCount: number
  lastMessage: Record<string, unknown> | null
}

export async function isConversationParticipant(conversationId: string, userId: Types.ObjectId): Promise<boolean> {
  const exists = await Message.exists({
    conversationId,
    $or: [{ sender: userId }, { receiver: userId }],
  })

  return Boolean(exists)
}

export async function markConversationRead(conversationId: string, userId: Types.ObjectId): Promise<number> {
  const result = await Message.updateMany(
    { conversationId, receiver: userId, read: false },
    { $set: { read: true, readAt: new Date() } }
  )

  return result.modifiedCount
}

export async function findConversationMessages(
  conversationId: string,
  pagination: PaginationInput
): Promise<{ messages: unknown[]; total: number }> {
  const skip = (pagination.page - 1) * pagination.pageSize

  const [messages, total] = await Promise.all([
    Message.find({ conversationId })
      .populate('sender', 'name email avatar banned')
      .populate('receiver', 'name email avatar banned')
      .populate('product', 'title price images')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(pagination.pageSize)
      .lean(),
    Message.countDocuments({ conversationId }),
  ])

  return { messages, total }
}

export async function findUserConversations(
  userId: Types.ObjectId,
  pagination: PaginationInput
): Promise<{ conversations: ConversationAggregateResult[]; total: number; totalUnread: number }> {
  const skip = (pagination.page - 1) * pagination.pageSize

  const pipeline: PipelineStage[] = [
    {
      $match: {
        $or: [{ sender: userId }, { receiver: userId }],
      },
    },
    {
      $sort: { createdAt: -1 as const },
    },
    {
      $group: {
        _id: '$conversationId',
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [{ $eq: ['$receiver', userId] }, { $eq: ['$read', false] }],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $sort: { 'lastMessage.createdAt': -1 as const },
    },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: pagination.pageSize },
          {
            $lookup: {
              from: 'users',
              localField: 'lastMessage.sender',
              foreignField: '_id',
              as: 'sender',
              pipeline: [{ $project: { name: 1, email: 1, avatar: 1, banned: 1 } }],
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'lastMessage.receiver',
              foreignField: '_id',
              as: 'receiver',
              pipeline: [{ $project: { name: 1, email: 1, avatar: 1, banned: 1 } }],
            },
          },
          {
            $lookup: {
              from: 'products',
              localField: 'lastMessage.product',
              foreignField: '_id',
              as: 'product',
              pipeline: [{ $project: { title: 1, price: 1, images: 1 } }],
            },
          },
          {
            $addFields: {
              conversationId: '$_id',
              lastMessage: {
                _id: '$lastMessage._id',
                conversationId: '$lastMessage.conversationId',
                content: '$lastMessage.content',
                createdAt: '$lastMessage.createdAt',
                receivedAt: '$lastMessage.receivedAt',
                read: '$lastMessage.read',
                readAt: '$lastMessage.readAt',
                sender: { $first: '$sender' },
                receiver: { $first: '$receiver' },
                product: { $first: '$product' },
              },
            },
          },
          {
            $project: {
              _id: 0,
              conversationId: 1,
              unreadCount: 1,
              lastMessage: 1,
            },
          },
        ],
        totalCount: [{ $count: 'count' }],
        unreadTotals: [{ $group: { _id: null, totalUnread: { $sum: '$unreadCount' } } }],
      },
    },
  ]

  const result = await Message.aggregate(pipeline)
  const root = (result?.[0] ?? {}) as {
    data?: ConversationAggregateResult[]
    totalCount?: Array<{ count: number }>
    unreadTotals?: Array<{ totalUnread: number }>
  }

  const conversations = Array.isArray(root.data) ? root.data : []
  const total = root.totalCount?.[0]?.count ?? 0
  const totalUnread = root.unreadTotals?.[0]?.totalUnread ?? 0

  return { conversations, total, totalUnread }
}

export async function findMessagingUser(userId: string): Promise<{ blockedUsers: Types.ObjectId[]; banned?: boolean } | null> {
  const user = await User.findById(userId).select('blockedUsers banned').lean()
  if (!user) return null

  const blockedUsers = Array.isArray(user.blockedUsers)
    ? user.blockedUsers.map((id: Types.ObjectId | string) => new Types.ObjectId(id.toString()))
    : []

  return {
    blockedUsers,
    banned: Boolean(user.banned),
  }
}

export async function findProductForMessaging(productId: string): Promise<{ sellerId: string; status: string } | null> {
  const product = await Product.findById(productId).select('seller status').lean()
  if (!product || !product.seller) return null

  return {
    sellerId: product.seller.toString(),
    status: String(product.status),
  }
}

export async function findRecentDuplicateMessage(params: {
  senderId: Types.ObjectId
  receiverId: string
  productId?: string
  content: string
  windowMs: number
}): Promise<boolean> {
  const duplicate = await Message.findOne({
    sender: params.senderId,
    receiver: params.receiverId,
    product: params.productId || null,
    content: params.content,
    createdAt: { $gte: new Date(Date.now() - params.windowMs) },
  })
    .select('_id')
    .lean()

  return Boolean(duplicate)
}

export async function createMessage(params: {
  conversationId: string
  senderId: Types.ObjectId
  receiverId: string
  productId?: string
  content: string
}): Promise<string> {
  const created = await Message.create({
    conversationId: params.conversationId,
    sender: params.senderId,
    receiver: params.receiverId,
    product: params.productId || null,
    content: params.content,
    receivedAt: new Date(),
    readAt: null,
  })

  return created._id.toString()
}

export async function findMessageById(messageId: string): Promise<unknown | null> {
  return Message.findById(messageId)
    .populate('sender', 'name email avatar banned')
    .populate('receiver', 'name email avatar banned')
    .populate('product', 'title price images')
    .lean()
}

export async function touchProductInquiry(productId: string): Promise<void> {
  await Product.updateOne(
    { _id: productId, status: 'active' },
    { $set: { lastInquiry: new Date() } }
  )
}
