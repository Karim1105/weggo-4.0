import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { NextRequest } from 'next/server'

let mongo: MongoMemoryServer

const loadConnectDB = async () => import('@/lib/db')
const loadAuth = async () => import('@/lib/auth')
const loadUserModel = async () => import('@/models/User')
const loadProductModel = async () => import('@/models/Product')
const loadReviewModel = async () => import('@/models/Review')
const loadMessageModel = async () => import('@/models/Message')
const loadBanAppealModel = async () => import('@/models/BanAppeal')
const loadAuthMeRoute = async () => import('@/app/api/auth/me/route')
const loadBlocksRoute = async () => import('@/app/api/blocks/route')
const loadAdminUserListingsRoute = async () => import('@/app/api/admin/users/[id]/listings/route')
const loadAdminUserChatsRoute = async () => import('@/app/api/admin/users/[id]/chats/route')
const loadAdminSellersRoute = async () => import('@/app/api/admin/sellers/route')
const loadAdminAppealRoute = async () => import('@/app/api/admin/ban-appeals/[id]/route')
const loadListingRoute = async () => import('@/app/api/listings/[id]/route')

function authedJsonRequest(
  url: string,
  token: string,
  method: 'GET' | 'POST' | 'DELETE',
  body?: Record<string, any>,
  ip: string = '10.1.0.1'
) {
  const headers = new Headers({
    cookie: `token=${token}`,
    'x-forwarded-for': ip,
  })
  if (body) {
    headers.set('content-type', 'application/json')
  }

  return new NextRequest(url, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongo.getUri()
  process.env.JWT_SECRET = 'test-secret'
})

afterEach(async () => {
  if (mongoose.connection.readyState) {
    await mongoose.connection.dropDatabase()
  }
})

afterAll(async () => {
  if (mongoose.connection.readyState) {
    await mongoose.disconnect()
  }
  await mongo.stop()
})

describe('priority 2 fixes integration', () => {
  it('returns ban metadata from /api/auth/me for authenticated users', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const User = (await loadUserModel()).default
    const { generateToken } = await loadAuth()
    const { GET } = await loadAuthMeRoute()

    const bannedAt = new Date('2026-01-01T00:00:00.000Z')
    const user = await User.create({
      name: 'Banned User',
      email: 'me@example.com',
      password: 'Aa123456',
      location: 'Cairo',
      banned: true,
      bannedAt,
      bannedReason: 'Spam',
    })

    const token = generateToken(user as any)
    const res = await GET(authedJsonRequest('http://localhost/api/auth/me', token, 'GET'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.user.banned).toBe(true)
    expect(json.user.bannedReason).toBe('Spam')
    expect(json.user.bannedAt).toBeTruthy()
  }, 20000)

  it('validates block targets before mutating blocked users', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const User = (await loadUserModel()).default
    const { generateToken } = await loadAuth()
    const { POST } = await loadBlocksRoute()

    const user = await User.create({
      name: 'Requester',
      email: 'requester@example.com',
      password: 'Aa123456',
      location: 'Cairo',
    })

    const token = generateToken(user as any)

    const invalidRes = await POST(
      authedJsonRequest('http://localhost/api/blocks', token, 'POST', { userId: 'not-an-id' })
    )
    expect(invalidRes.status).toBe(400)

    const missingRes = await POST(
      authedJsonRequest(
        'http://localhost/api/blocks',
        token,
        'POST',
        { userId: new mongoose.Types.ObjectId().toString() }
      )
    )
    expect(missingRes.status).toBe(404)
  }, 20000)

  it('returns correct recent reviews for admin seller listings and exposes seller counts sanely', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const User = (await loadUserModel()).default
    const Product = (await loadProductModel()).default
    const Review = (await loadReviewModel()).default
    const { generateToken } = await loadAuth()
    const { GET: getAdminUserListings } = await loadAdminUserListingsRoute()
    const { GET: getAdminSellers } = await loadAdminSellersRoute()

    const admin = await User.create({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'Aa123456',
      location: 'Cairo',
      role: 'admin',
    })
    const sellerWithListing = await User.create({
      name: 'Seller With Listing',
      email: 'seller-with-listing@example.com',
      password: 'Aa123456',
      location: 'Cairo',
    })
    const verifiedSeller = await User.create({
      name: 'Verified Seller',
      email: 'verified-seller@example.com',
      password: 'Aa123456',
      location: 'Giza',
      sellerVerified: true,
    })
    const reviewer = await User.create({
      name: 'Reviewer',
      email: 'reviewer-admin@example.com',
      password: 'Aa123456',
      location: 'Alexandria',
    })

    const product = await Product.create({
      title: 'Phone',
      description: 'Latest phone',
      price: 1000,
      category: 'electronics',
      condition: 'Good',
      location: 'Cairo',
      images: ['/uploads/phone.jpg'],
      seller: sellerWithListing._id,
      status: 'active',
    })

    await Review.create({
      reviewer: reviewer._id,
      seller: sellerWithListing._id,
      product: product._id,
      rating: 4,
      comment: 'Helpful seller',
    })

    const adminToken = generateToken(admin as any)
    const listingsRes = await getAdminUserListings(
      authedJsonRequest(
        `http://localhost/api/admin/users/${sellerWithListing._id.toString()}/listings`,
        adminToken,
        'GET'
      ),
      { params: Promise.resolve({ id: sellerWithListing._id.toString() }) }
    )
    const listingsJson = await listingsRes.json()

    expect(listingsRes.status).toBe(200)
    expect(listingsJson.success).toBe(true)
    expect(listingsJson.data.recentReviews).toHaveLength(1)
    expect(listingsJson.data.recentReviews[0].reviewer.name).toBe('Reviewer')

    const sellersRes = await getAdminSellers(
      authedJsonRequest('http://localhost/api/admin/sellers', adminToken, 'GET')
    )
    const sellersJson = await sellersRes.json()
    const sellerIds = sellersJson.data.sellers.map((seller: any) => seller._id.toString())

    expect(sellersRes.status).toBe(200)
    expect(sellersJson.success).toBe(true)
    expect(sellerIds).toContain(sellerWithListing._id.toString())
    expect(sellerIds).toContain(verifiedSeller._id.toString())
    expect(
      sellersJson.data.sellers.find((seller: any) => seller._id.toString() === sellerWithListing._id.toString())
        .listingCount
    ).toBe(1)
    expect(sellersJson.data.pagination.total).toBe(2)
  }, 20000)

  it('returns explicit 400 responses for malformed dynamic IDs instead of 500s', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const User = (await loadUserModel()).default
    const { generateToken } = await loadAuth()
    const { GET: getListing } = await loadListingRoute()
    const { GET: getAdminUserChats } = await loadAdminUserChatsRoute()
    const { GET: getAdminAppeal } = await loadAdminAppealRoute()

    const admin = await User.create({
      name: 'Admin',
      email: 'invalid-id-admin@example.com',
      password: 'Aa123456',
      location: 'Cairo',
      role: 'admin',
    })
    const adminToken = generateToken(admin as any)

    const listingRes = await getListing(
      new NextRequest('http://localhost/api/listings/not-an-id'),
      { params: Promise.resolve({ id: 'not-an-id' }) }
    )
    expect(listingRes.status).toBe(400)

    const chatsRes = await getAdminUserChats(
      authedJsonRequest('http://localhost/api/admin/users/not-an-id/chats', adminToken, 'GET'),
      { params: Promise.resolve({ id: 'not-an-id' }) }
    )
    expect(chatsRes.status).toBe(400)

    const appealRes = await getAdminAppeal(
      authedJsonRequest('http://localhost/api/admin/ban-appeals/not-an-id', adminToken, 'GET'),
      { params: Promise.resolve({ id: 'not-an-id' }) }
    )
    expect(appealRes.status).toBe(400)
  }, 20000)

  it('supports admin appeal detail fetches alongside linked chats and listings', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const User = (await loadUserModel()).default
    const Product = (await loadProductModel()).default
    const Message = (await loadMessageModel()).default
    const BanAppeal = (await loadBanAppealModel()).default
    const { generateToken } = await loadAuth()
    const { GET: getAdminAppeal } = await loadAdminAppealRoute()
    const { GET: getAdminUserChats } = await loadAdminUserChatsRoute()
    const { GET: getAdminUserListings } = await loadAdminUserListingsRoute()

    const admin = await User.create({
      name: 'Admin',
      email: 'appeals-admin@example.com',
      password: 'Aa123456',
      location: 'Cairo',
      role: 'admin',
    })
    const bannedUser = await User.create({
      name: 'Banned Seller',
      email: 'banned-seller@example.com',
      password: 'Aa123456',
      location: 'Cairo',
      banned: true,
      bannedAt: new Date(),
      bannedReason: 'Spam',
    })
    const buyer = await User.create({
      name: 'Buyer',
      email: 'buyer-priority2@example.com',
      password: 'Aa123456',
      location: 'Giza',
    })

    const product = await Product.create({
      title: 'Laptop',
      description: 'Gaming laptop',
      price: 2500,
      category: 'electronics',
      condition: 'Excellent',
      location: 'Cairo',
      images: ['/uploads/laptop.jpg'],
      seller: bannedUser._id,
      status: 'active',
    })

    await Message.create({
      conversationId: `${bannedUser._id.toString()}_${buyer._id.toString()}_${product._id.toString()}`,
      sender: buyer._id,
      receiver: bannedUser._id,
      product: product._id,
      content: 'Can we meet today?',
    })

    const appeal = await BanAppeal.create({
      userId: bannedUser._id,
      reason: bannedUser.bannedReason,
      appealMessage: 'Please reconsider the ban.',
      status: 'pending',
    })

    const adminToken = generateToken(admin as any)

    const appealRes = await getAdminAppeal(
      authedJsonRequest(
        `http://localhost/api/admin/ban-appeals/${appeal._id.toString()}`,
        adminToken,
        'GET'
      ),
      { params: Promise.resolve({ id: appeal._id.toString() }) }
    )
    const appealJson = await appealRes.json()
    expect(appealRes.status).toBe(200)
    expect(appealJson.success).toBe(true)
    expect(appealJson.data.appeal.userId.email).toBe('banned-seller@example.com')

    const chatsRes = await getAdminUserChats(
      authedJsonRequest(
        `http://localhost/api/admin/users/${bannedUser._id.toString()}/chats`,
        adminToken,
        'GET'
      ),
      { params: Promise.resolve({ id: bannedUser._id.toString() }) }
    )
    const chatsJson = await chatsRes.json()
    expect(chatsRes.status).toBe(200)
    expect(chatsJson.success).toBe(true)
    expect(chatsJson.data.conversations).toHaveLength(1)

    const listingsRes = await getAdminUserListings(
      authedJsonRequest(
        `http://localhost/api/admin/users/${bannedUser._id.toString()}/listings`,
        adminToken,
        'GET'
      ),
      { params: Promise.resolve({ id: bannedUser._id.toString() }) }
    )
    const listingsJson = await listingsRes.json()
    expect(listingsRes.status).toBe(200)
    expect(listingsJson.success).toBe(true)
    expect(listingsJson.data.listings).toHaveLength(1)
  }, 20000)
})
