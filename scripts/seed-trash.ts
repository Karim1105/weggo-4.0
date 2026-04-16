import mongoose from 'mongoose'
import connectDB from '@/lib/db'
import BanAppeal from '@/models/BanAppeal'
import Message from '@/models/Message'
import Product from '@/models/Product'
import Report from '@/models/Report'
import Review from '@/models/Review'
import SavedSearch from '@/models/SavedSearch'
import Ticket from '@/models/Ticket'
import TicketMessage from '@/models/TicketMessage'
import User from '@/models/User'
import ViewHistory from '@/models/ViewHistory'
import Wishlist from '@/models/Wishlist'

const COUNT = Math.max(1, Number(process.env.SEED_TRASH_COUNT || '10'))
const runId = Date.now().toString()
const TRASH_PASSWORD = '123456'

const pick = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)]

async function seedTrashData() {
  await connectDB()

  const admin = await User.create({
    name: `Trash Admin ${runId}`,
    email: `trash-admin-${runId}@weggo.local`,
    password: TRASH_PASSWORD,
    role: 'admin',
    isVerified: true,
    sellerVerified: true,
    location: 'Cairo',
  })

  const seller = await User.create({
    name: `Trash Seller ${runId}`,
    email: `trash-seller-${runId}@weggo.local`,
    password: TRASH_PASSWORD,
    role: 'user',
    isVerified: true,
    sellerVerified: true,
    location: 'Giza',
    averageRating: 4.1,
    ratingCount: COUNT,
  })

  const buyers = await Promise.all(
    Array.from({ length: 4 }).map((_, index) =>
      User.create({
        name: `Trash User ${index + 1} ${runId}`,
        email: `trash-user-${index + 1}-${runId}@weggo.local`,
        password: TRASH_PASSWORD,
        role: 'user',
        isVerified: true,
        sellerVerified: index % 2 === 0,
        location: index % 2 === 0 ? 'Cairo' : 'Alexandria',
      })
    )
  )

  const bannedUser = await User.create({
    name: `Trash Banned ${runId}`,
    email: `trash-banned-${runId}@weggo.local`,
    password: TRASH_PASSWORD,
    role: 'user',
    isVerified: true,
    sellerVerified: false,
    location: 'Mansoura',
    banned: true,
    bannedAt: new Date(),
    bannedBy: admin._id,
    bannedReason: 'Auto-generated trash seed data',
  })

  const categories = ['Electronics', 'Fashion', 'Home', 'Gaming', 'Sports']
  const conditions: Array<'New' | 'Like New' | 'Excellent' | 'Good' | 'Fair' | 'Poor'> = [
    'New',
    'Like New',
    'Excellent',
    'Good',
    'Fair',
    'Poor',
  ]

  const products = await Promise.all(
    Array.from({ length: COUNT }).map((_, index) =>
      Product.create({
        title: `Trash Product ${index + 1} ${runId}`,
        description: `Auto-generated testing product #${index + 1} for run ${runId}`,
        price: 100 + index * 25,
        category: pick(categories),
        subcategory: `Sub-${(index % 4) + 1}`,
        condition: pick(conditions),
        location: index % 2 === 0 ? 'Cairo' : 'Giza',
        images: [`https://picsum.photos/seed/trash-${runId}-${index}/640/640`],
        seller: seller._id,
        status: index % 7 === 0 ? 'sold' : 'active',
        views: index * 3,
        isBoosted: index % 3 === 0,
        boostedAt: index % 3 === 0 ? new Date() : undefined,
        boostedBy: index % 3 === 0 ? seller._id : undefined,
      })
    )
  )

  const reviewCount = Math.min(COUNT, products.length)
  await Promise.all(
    Array.from({ length: reviewCount }).map((_, index) => {
      const reviewer = buyers[index % buyers.length]
      const product = products[index]
      return Review.create({
        reviewer: reviewer._id,
        seller: seller._id,
        product: product._id,
        rating: (index % 5) + 1,
        comment: `Trash review ${index + 1} for testing`,
      })
    })
  )

  await Promise.all(
    Array.from({ length: Math.max(2, Math.floor(COUNT / 2)) }).map((_, index) =>
      Report.create({
        listing: products[index % products.length]._id,
        reporter: buyers[index % buyers.length]._id,
        reason: index % 2 === 0 ? 'spam' : 'inappropriate',
        description: `Trash report ${index + 1} from run ${runId}`,
        status: index % 4 === 0 ? 'reviewed' : 'pending',
        reviewedBy: index % 4 === 0 ? admin._id : undefined,
        reviewedAt: index % 4 === 0 ? new Date() : undefined,
      })
    )
  )

  await Promise.all(
    Array.from({ length: COUNT }).map((_, index) => {
      const sender = buyers[index % buyers.length]
      const receiver = seller
      const product = products[index % products.length]
      return Message.create({
        conversationId: `${sender._id}-${receiver._id}-${product._id}`,
        sender: sender._id,
        receiver: receiver._id,
        product: product._id,
        content: `Trash message ${index + 1} for test conversation ${runId}`,
        read: index % 2 === 0,
        readAt: index % 2 === 0 ? new Date() : null,
      })
    })
  )

  await Promise.all(
    buyers.map((buyer, index) =>
      SavedSearch.create({
        user: buyer._id,
        name: `Trash Search ${index + 1} ${runId}`,
        params: {
          category: categories[index % categories.length],
          condition: conditions[index % conditions.length],
          location: index % 2 === 0 ? 'Cairo' : 'Alexandria',
        },
      })
    )
  )

  const tickets = await Promise.all(
    buyers.slice(0, 3).map((buyer, index) =>
      Ticket.create({
        userId: buyer._id,
        subject: `Trash Ticket ${index + 1} ${runId}`,
        status: index === 2 ? 'pending' : 'open',
        assignedAdminId: admin._id,
        unreadByUser: false,
        unreadByAdmin: true,
        lastMessageAt: new Date(),
      })
    )
  )

  await Promise.all(
    tickets.flatMap((ticket, index) => {
      const buyer = buyers[index]
      return [
        TicketMessage.create({
          ticketId: ticket._id,
          senderId: buyer._id,
          senderRole: 'user',
          message: `User message for trash ticket ${index + 1}`,
          attachments: [],
        }),
        TicketMessage.create({
          ticketId: ticket._id,
          senderId: admin._id,
          senderRole: 'admin',
          message: `Admin response for trash ticket ${index + 1}`,
          attachments: [],
        }),
      ]
    })
  )

  await Promise.all(
    buyers.map((buyer, index) =>
      ViewHistory.create({
        user: buyer._id,
        product: products[index % products.length]._id,
        viewedAt: new Date(Date.now() - index * 60_000),
      })
    )
  )

  await Promise.all(
    buyers.map((buyer, index) =>
      Wishlist.create({
        user: buyer._id,
        product: products[(index + 1) % products.length]._id,
      })
    )
  )

  await BanAppeal.create({
    userId: bannedUser._id,
    bannedBy: admin._id,
    reason: bannedUser.bannedReason || 'Auto-generated reason',
    appealMessage: `Please review this ban appeal generated in trash seed run ${runId}.`,
    status: 'pending',
  })

  return {
    users: 7,
    products: products.length,
    reviews: reviewCount,
    reports: Math.max(2, Math.floor(COUNT / 2)),
    messages: COUNT,
    savedSearches: buyers.length,
    tickets: tickets.length,
    ticketMessages: tickets.length * 2,
    viewHistory: buyers.length,
    wishlist: buyers.length,
    banAppeals: 1,
  }
}

seedTrashData()
  .then((summary) => {
    console.log('Trash seed completed:', summary)
  })
  .catch((error: unknown) => {
    console.error('Trash seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
  })
