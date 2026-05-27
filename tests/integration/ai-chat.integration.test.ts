import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { NextRequest } from 'next/server'

let mongo: MongoMemoryServer

const loadConnectDB = async () => import('@/lib/db')
const loadUserModel = async () => import('@/models/User')
const loadProductModel = async () => import('@/models/Product')
const loadAiChatRoute = async () => import('@/app/api/ai-chat/route')

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

describe('ai chat route integration', () => {
  it('rejects missing message payloads', async () => {
    const { POST } = await loadAiChatRoute()

    const res = await POST(
      new NextRequest('http://localhost/api/ai-chat', {
        method: 'POST',
        headers: new Headers({ 'content-type': 'application/json' }),
        body: JSON.stringify({}),
      })
    )
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error).toBe('Message is required')
  }, 20000)

  it('returns a marketplace fallback for non-listing questions', async () => {
    const { POST } = await loadAiChatRoute()

    const res = await POST(
      new NextRequest('http://localhost/api/ai-chat', {
        method: 'POST',
        headers: new Headers({ 'content-type': 'application/json' }),
        body: JSON.stringify({ message: 'How does Weggo work?' }),
      })
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(typeof json.timestamp).toBe('string')
    expect(json.response).toContain('Weggo lets you browse listings')
  }, 20000)

  it('returns active matched listings and excludes inactive ones', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const User = (await loadUserModel()).default
    const Product = (await loadProductModel()).default
    const { POST } = await loadAiChatRoute()

    const seller = await User.create({
      name: 'Chat Seller',
      email: 'chat-active@example.com',
      password: 'Aa123456',
      location: 'Cairo',
    })

    await Product.create([
      {
        title: 'Galaxy Phone Active',
        description: 'An active listing that should be returned',
        price: 12000,
        category: 'electronics',
        condition: 'Excellent',
        location: 'Cairo',
        images: ['/uploads/galaxy-active.jpg'],
        seller: seller._id,
        status: 'active',
      },
      {
        title: 'Galaxy Phone Sold',
        description: 'A sold listing that should not be returned',
        price: 10000,
        category: 'electronics',
        condition: 'Good',
        location: 'Giza',
        images: ['/uploads/galaxy-sold.jpg'],
        seller: seller._id,
        status: 'sold',
      },
    ])

    const res = await POST(
      new NextRequest('http://localhost/api/ai-chat', {
        method: 'POST',
        headers: new Headers({ 'content-type': 'application/json' }),
        body: JSON.stringify({ message: 'Show me phones' }),
      })
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.response).toContain('Galaxy Phone Active')
    expect(json.response).not.toContain('Galaxy Phone Sold')
    expect(json.response).toContain('Cairo')
  }, 20000)

  it('falls back to category listings when keyword matches are absent', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const User = (await loadUserModel()).default
    const Product = (await loadProductModel()).default
    const { POST } = await loadAiChatRoute()

    const seller = await User.create({
      name: 'Laptop Seller',
      email: 'chat-laptops@example.com',
      password: 'Aa123456',
      location: 'Alexandria',
    })

    await Product.create({
      title: 'Ultrabook Pro 14',
      description: 'Portable work machine',
      price: 22000,
      category: 'electronics',
      condition: 'Like New',
      location: 'Alexandria',
      images: ['/uploads/ultrabook.jpg'],
      seller: seller._id,
      status: 'active',
    })

    const res = await POST(
      new NextRequest('http://localhost/api/ai-chat', {
        method: 'POST',
        headers: new Headers({ 'content-type': 'application/json' }),
        body: JSON.stringify({ message: 'Find laptops' }),
      })
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.response).toContain('Ultrabook Pro 14')
    expect(json.response).toContain('If you want more, head to Browse')
  }, 20000)
})
