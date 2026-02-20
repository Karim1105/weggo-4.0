import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { NextRequest } from 'next/server'

let mongo: MongoMemoryServer

const loadWishlist = async () => import('@/app/api/wishlist/route')
const loadConnectDB = async () => import('@/lib/db')
const loadAuth = async () => import('@/lib/auth')
const loadUserModel = async () => import('@/models/User')
const loadProductModel = async () => import('@/models/Product')

function authedJsonRequest(url: string, token: string, method: 'GET' | 'POST' | 'DELETE', body?: Record<string, any>) {
  const headers = new Headers({ cookie: `token=${token}` })
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

describe('wishlist integration', () => {
  it('stores multiple products for the same user and returns them in GET', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const User = (await loadUserModel()).default
    const Product = (await loadProductModel()).default
    const { generateToken } = await loadAuth()

    const user = await User.create({
      name: 'Wishlist User',
      email: 'wishlist-user@example.com',
      password: 'Aa123456',
      location: 'Cairo',
    })

    const [p1, p2] = await Product.create([
      {
        title: 'Wishlist Product A',
        description: 'First wishlist product',
        price: 100,
        category: 'electronics',
        condition: 'Good',
        location: 'Cairo',
        images: ['/uploads/a.jpg'],
        seller: new mongoose.Types.ObjectId(),
        status: 'active',
      },
      {
        title: 'Wishlist Product B',
        description: 'Second wishlist product',
        price: 200,
        category: 'electronics',
        condition: 'Good',
        location: 'Giza',
        images: ['/uploads/b.jpg'],
        seller: new mongoose.Types.ObjectId(),
        status: 'active',
      },
    ])

    const token = generateToken(user as any)
    const { GET, POST } = await loadWishlist()

    const addFirst = await POST(
      authedJsonRequest('http://localhost/api/wishlist', token, 'POST', { productId: p1._id.toString() })
    )
    expect(addFirst.status).toBe(200)

    const addSecond = await POST(
      authedJsonRequest('http://localhost/api/wishlist', token, 'POST', { productId: p2._id.toString() })
    )
    expect(addSecond.status).toBe(200)

    const getRes = await GET(authedJsonRequest('http://localhost/api/wishlist', token, 'GET'))
    const getJson = await getRes.json()

    expect(getJson.success).toBe(true)
    expect(Array.isArray(getJson.wishlist)).toBe(true)
    expect(getJson.wishlist.length).toBe(2)
    const ids = new Set(getJson.wishlist.map((p: any) => String(p._id)))
    expect(ids.has(String(p1._id))).toBe(true)
    expect(ids.has(String(p2._id))).toBe(true)
  }, 15000)

  it('supports idempotent adds and removes a single selected product', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const User = (await loadUserModel()).default
    const Product = (await loadProductModel()).default
    const { generateToken } = await loadAuth()

    const user = await User.create({
      name: 'Wishlist User 2',
      email: 'wishlist-user2@example.com',
      password: 'Aa123456',
      location: 'Alexandria',
    })

    const [p1, p2] = await Product.create([
      {
        title: 'Wishlist Product C',
        description: 'Third wishlist product',
        price: 300,
        category: 'electronics',
        condition: 'Good',
        location: 'Alexandria',
        images: ['/uploads/c.jpg'],
        seller: new mongoose.Types.ObjectId(),
        status: 'active',
      },
      {
        title: 'Wishlist Product D',
        description: 'Fourth wishlist product',
        price: 400,
        category: 'electronics',
        condition: 'Good',
        location: 'Cairo',
        images: ['/uploads/d.jpg'],
        seller: new mongoose.Types.ObjectId(),
        status: 'active',
      },
    ])

    const token = generateToken(user as any)
    const { GET, POST, DELETE } = await loadWishlist()

    await POST(
      authedJsonRequest('http://localhost/api/wishlist', token, 'POST', { productId: p1._id.toString() })
    )
    await POST(
      authedJsonRequest('http://localhost/api/wishlist', token, 'POST', { productId: p2._id.toString() })
    )

    // Duplicate add should be idempotent and keep data intact.
    const duplicate = await POST(
      authedJsonRequest('http://localhost/api/wishlist', token, 'POST', { productId: p1._id.toString() })
    )
    const duplicateJson = await duplicate.json()
    expect(duplicate.status).toBe(200)
    expect(duplicateJson.success).toBe(true)

    const removeFirst = await DELETE(
      authedJsonRequest('http://localhost/api/wishlist', token, 'DELETE', { productId: p1._id.toString() })
    )
    expect(removeFirst.status).toBe(200)

    const getRes = await GET(authedJsonRequest('http://localhost/api/wishlist', token, 'GET'))
    const getJson = await getRes.json()
    expect(getJson.success).toBe(true)
    expect(getJson.wishlist.length).toBe(1)
    expect(String(getJson.wishlist[0]._id)).toBe(String(p2._id))
  }, 15000)
})
