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
const loadBanAppealModel = async () => import('@/models/BanAppeal')
const loadMessagesRoute = async () => import('@/app/api/messages/route')
const loadReviewsRoute = async () => import('@/app/api/reviews/route')
const loadAppealsRoute = async () => import('@/app/api/users/ban-appeals/route')
const loadAppealSubmitRoute = async () => import('@/app/api/users/ban-appeals/submit/route')
const loadListingRoute = async () => import('@/app/api/listings/[id]/route')
const loadBulkDeleteRoute = async () => import('@/app/api/admin/listings/bulk-delete/route')

function authedJsonRequest(
  url: string,
  token: string,
  method: 'GET' | 'POST' | 'DELETE',
  body?: Record<string, any>,
  ip: string = '10.0.0.1'
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

describe('priority 1 fixes integration', () => {
  it('requires the listing seller to be a messaging participant and the listing to be active', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const User = (await loadUserModel()).default
    const Product = (await loadProductModel()).default
    const { generateToken } = await loadAuth()
    const { POST } = await loadMessagesRoute()

    const seller = await User.create({
      name: 'Seller',
      email: 'seller@example.com',
      password: 'Aa123456',
      location: 'Cairo',
    })
    const buyer = await User.create({
      name: 'Buyer',
      email: 'buyer@example.com',
      password: 'Aa123456',
      location: 'Giza',
    })
    const unrelated = await User.create({
      name: 'Unrelated',
      email: 'unrelated@example.com',
      password: 'Aa123456',
      location: 'Alexandria',
    })

    const activeProduct = await Product.create({
      title: 'Camera',
      description: 'Active listing',
      price: 500,
      category: 'electronics',
      condition: 'Good',
      location: 'Cairo',
      images: ['/uploads/camera.jpg'],
      seller: seller._id,
      status: 'active',
    })

    const inactiveProduct = await Product.create({
      title: 'Inactive Camera',
      description: 'Deleted listing',
      price: 400,
      category: 'electronics',
      condition: 'Good',
      location: 'Cairo',
      images: ['/uploads/camera2.jpg'],
      seller: seller._id,
      status: 'deleted',
    })

    const buyerToken = generateToken(buyer as any)

    const mismatchRes = await POST(
      authedJsonRequest(
        'http://localhost/api/messages',
        buyerToken,
        'POST',
        {
          receiverId: unrelated._id.toString(),
          productId: activeProduct._id.toString(),
          content: 'Is this still available?',
        },
        '10.0.0.2'
      )
    )
    expect(mismatchRes.status).toBe(400)

    const inactiveRes = await POST(
      authedJsonRequest(
        'http://localhost/api/messages',
        buyerToken,
        'POST',
        {
          receiverId: seller._id.toString(),
          productId: inactiveProduct._id.toString(),
          content: 'Can I buy this?',
        },
        '10.0.0.3'
      )
    )
    expect(inactiveRes.status).toBe(400)

    const validRes = await POST(
      authedJsonRequest(
        'http://localhost/api/messages',
        buyerToken,
        'POST',
        {
          receiverId: seller._id.toString(),
          productId: activeProduct._id.toString(),
          content: 'Can I buy this today?',
        },
        '10.0.0.4'
      )
    )
    const validJson = await validRes.json()
    expect(validRes.status).toBe(200)
    expect(validJson.success).toBe(true)
  }, 20000)

  it('serves seller reviews publicly without authentication', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const User = (await loadUserModel()).default
    const Product = (await loadProductModel()).default
    const Review = (await loadReviewModel()).default
    const { GET } = await loadReviewsRoute()

    const seller = await User.create({
      name: 'Seller',
      email: 'review-seller@example.com',
      password: 'Aa123456',
      location: 'Cairo',
    })
    const reviewer = await User.create({
      name: 'Reviewer',
      email: 'reviewer@example.com',
      password: 'Aa123456',
      location: 'Cairo',
    })
    const product = await Product.create({
      title: 'Desk',
      description: 'Wooden desk',
      price: 800,
      category: 'furniture',
      condition: 'Good',
      location: 'Cairo',
      images: ['/uploads/desk.jpg'],
      seller: seller._id,
      status: 'active',
    })

    await Review.create({
      reviewer: reviewer._id,
      seller: seller._id,
      product: product._id,
      rating: 5,
      comment: 'Great seller',
    })

    const req = new NextRequest(`http://localhost/api/reviews?sellerId=${seller._id.toString()}`)
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.totalReviews).toBe(1)
    expect(json.reviews[0].comment).toBe('Great seller')
  }, 20000)

  it('supports authenticated user appeal submission and retrieval', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const User = (await loadUserModel()).default
    const BanAppeal = (await loadBanAppealModel()).default
    const { generateToken } = await loadAuth()
    const { GET } = await loadAppealsRoute()
    const { POST } = await loadAppealSubmitRoute()

    const bannedUser = await User.create({
      name: 'Banned User',
      email: 'banned@example.com',
      password: 'Aa123456',
      location: 'Cairo',
      banned: true,
      bannedAt: new Date(),
      bannedReason: 'Spam',
    })

    const token = generateToken(bannedUser as any)

    const initialGet = await GET(
      authedJsonRequest('http://localhost/api/users/ban-appeals', token, 'GET', undefined, '10.0.0.5')
    )
    const initialJson = await initialGet.json()
    expect(initialGet.status).toBe(200)
    expect(initialJson.success).toBe(true)
    expect(initialJson.data.appeals.length).toBe(0)

    const submitRes = await POST(
      authedJsonRequest(
        'http://localhost/api/users/ban-appeals/submit',
        token,
        'POST',
        { appealMessage: 'Please review my case carefully.' },
        '10.0.0.6'
      )
    )
    const submitJson = await submitRes.json()
    expect(submitRes.status).toBe(201)
    expect(submitJson.success).toBe(true)

    expect(await BanAppeal.countDocuments({ userId: bannedUser._id })).toBe(1)

    const finalGet = await GET(
      authedJsonRequest('http://localhost/api/users/ban-appeals', token, 'GET', undefined, '10.0.0.7')
    )
    const finalJson = await finalGet.json()
    expect(finalGet.status).toBe(200)
    expect(finalJson.data.appeals.length).toBe(1)
  }, 20000)

  it('marks listing detail responses as private no-store', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const User = (await loadUserModel()).default
    const Product = (await loadProductModel()).default
    const { GET } = await loadListingRoute()

    const seller = await User.create({
      name: 'Seller',
      email: 'cache-seller@example.com',
      password: 'Aa123456',
      location: 'Cairo',
      phone: '01234567890',
    })

    const product = await Product.create({
      title: 'Phone',
      description: 'A product to test headers',
      price: 1000,
      category: 'electronics',
      condition: 'Good',
      location: 'Cairo',
      images: ['/uploads/phone.jpg'],
      seller: seller._id,
      status: 'active',
    })

    const res = await GET(new NextRequest(`http://localhost/api/listings/${product._id}`), {
      params: Promise.resolve({ id: product._id.toString() }),
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('private, no-store')
    expect(res.headers.get('Vary')).toBe('Cookie')
  }, 20000)

  it('soft-deletes admin bulk deletions instead of hard-deleting products', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const User = (await loadUserModel()).default
    const Product = (await loadProductModel()).default
    const { generateToken } = await loadAuth()
    const { POST } = await loadBulkDeleteRoute()

    const admin = await User.create({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'Aa123456',
      role: 'admin',
      location: 'Cairo',
    })

    const product = await Product.create({
      title: 'Bulk Delete Listing',
      description: 'Should remain in DB as soft deleted',
      price: 100,
      category: 'electronics',
      condition: 'Good',
      location: 'Cairo',
      images: ['/uploads/x.jpg'],
      seller: new mongoose.Types.ObjectId(),
      status: 'active',
    })

    const adminToken = generateToken(admin as any)
    const res = await POST(
      authedJsonRequest(
        'http://localhost/api/admin/listings/bulk-delete',
        adminToken,
        'POST',
        { listingIds: [product._id.toString()] },
        '10.0.0.8'
      )
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)

    const updated = await Product.findById(product._id).lean() as any
    expect(updated).not.toBeNull()
    expect(updated?.status).toBe('deleted')
    expect(updated?.expiresAt).toBeTruthy()
  }, 20000)
})
