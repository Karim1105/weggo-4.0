import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { NextRequest } from 'next/server'
import { clearCache, getCache, setCache } from '@/lib/cache'

let mongo: MongoMemoryServer

const loadConnectDB = async () => import('@/lib/db')
const loadAuth = async () => import('@/lib/auth')
const loadUserModel = async () => import('@/models/User')
const loadProductModel = async () => import('@/models/Product')
const loadListingRoute = async () => import('@/app/api/listings/[id]/route')
const loadRecentlyViewedRoute = async () => import('@/app/api/recently-viewed/route')
const loadAiChatRoute = async () => import('@/app/api/ai-chat/route')
const loadDebugCookiesRoute = async () => import('@/app/api/debug/cookies/route')
const loadBoostRoute = async () => import('@/app/api/admin/listings/[id]/boost/route')

function authedJsonRequest(
  url: string,
  token: string,
  method: 'GET' | 'POST' | 'DELETE',
  body?: Record<string, any>
) {
  const headers = new Headers({
    cookie: `token=${token}`,
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
  clearCache()
  delete process.env.DEBUG_COOKIES_SECRET

  if (mongoose.connection.readyState) {
    await mongoose.connection.dropDatabase()
  }
})

afterAll(async () => {
  clearCache()
  if (mongoose.connection.readyState) {
    await mongoose.disconnect()
  }
  await mongo.stop()
})

describe('priority 4 fixes integration', () => {
  it('redacts seller phone and location from public listing detail responses', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const User = (await loadUserModel()).default
    const Product = (await loadProductModel()).default
    const { GET } = await loadListingRoute()

    const seller = await User.create({
      name: 'Private Seller',
      email: 'private-seller@example.com',
      password: 'Aa123456',
      phone: '+201234567890',
      location: 'Cairo',
    })

    const product = await Product.create({
      title: 'Private Phone',
      description: 'Still available',
      price: 5000,
      category: 'electronics',
      condition: 'Good',
      location: 'Cairo',
      images: ['/uploads/private-phone.jpg'],
      seller: seller._id,
      status: 'active',
    })

    const res = await GET(
      new NextRequest(`http://localhost/api/listings/${product._id.toString()}`),
      { params: Promise.resolve({ id: product._id.toString() }) }
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.product.seller.phone).toBeUndefined()
    expect(json.product.seller.location).toBeUndefined()
  }, 20000)

  it('rejects invalid or missing products in recently viewed tracking', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const User = (await loadUserModel()).default
    const { generateToken } = await loadAuth()
    const { POST } = await loadRecentlyViewedRoute()

    const user = await User.create({
      name: 'Viewer',
      email: 'viewer@example.com',
      password: 'Aa123456',
      location: 'Cairo',
    })

    const token = generateToken(user as any)

    const invalidRes = await POST(
      authedJsonRequest('http://localhost/api/recently-viewed', token, 'POST', { productId: 'not-an-id' })
    )
    expect(invalidRes.status).toBe(400)

    const missingRes = await POST(
      authedJsonRequest(
        'http://localhost/api/recently-viewed',
        token,
        'POST',
        { productId: new mongoose.Types.ObjectId().toString() }
      )
    )
    expect(missingRes.status).toBe(404)
  }, 20000)

  it('serves chatbot listing suggestions from the shared server route', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const User = (await loadUserModel()).default
    const Product = (await loadProductModel()).default
    const { POST } = await loadAiChatRoute()

    const seller = await User.create({
      name: 'Chat Seller',
      email: 'chat-seller@example.com',
      password: 'Aa123456',
      location: 'Cairo',
    })

    await Product.create({
      title: 'Galaxy Phone',
      description: 'A recent phone listing',
      price: 12000,
      category: 'electronics',
      condition: 'Excellent',
      location: 'Cairo',
      images: ['/uploads/galaxy.jpg'],
      seller: seller._id,
      status: 'active',
    })

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
    expect(json.response).toContain('Galaxy Phone')
  }, 20000)

  it('requires a debug secret before exposing cookie diagnostics', async () => {
    const { GET } = await loadDebugCookiesRoute()

    const noSecretRes = await GET(new NextRequest('http://localhost/api/debug/cookies'))
    expect(noSecretRes.status).toBe(404)

    process.env.DEBUG_COOKIES_SECRET = 'debug-secret'

    const unauthorizedRes = await GET(
      new NextRequest('http://localhost/api/debug/cookies', {
        headers: new Headers({ cookie: 'token=abc123' }),
      })
    )
    expect(unauthorizedRes.status).toBe(401)

    const authorizedRes = await GET(
      new NextRequest('http://localhost/api/debug/cookies', {
        headers: new Headers({
          cookie: 'token=abc123',
          'x-debug-secret': 'debug-secret',
        }),
      })
    )
    const authorizedJson = await authorizedRes.json()

    expect(authorizedRes.status).toBe(200)
    expect(authorizedJson.success).toBe(true)
    expect(authorizedJson.cookies[0].name).toBe('token')
  }, 20000)

  it('clears related caches when admins boost a listing', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const User = (await loadUserModel()).default
    const Product = (await loadProductModel()).default
    const { generateToken } = await loadAuth()
    const { POST } = await loadBoostRoute()

    const admin = await User.create({
      name: 'Admin',
      email: 'boost-admin@example.com',
      password: 'Aa123456',
      location: 'Cairo',
      role: 'admin',
    })
    const seller = await User.create({
      name: 'Seller',
      email: 'boost-seller@example.com',
      password: 'Aa123456',
      location: 'Giza',
    })
    const product = await Product.create({
      title: 'Boostable Listing',
      description: 'Needs more visibility',
      price: 1500,
      category: 'electronics',
      condition: 'Good',
      location: 'Cairo',
      images: ['/uploads/boost.jpg'],
      seller: seller._id,
      status: 'active',
    })

    setCache('listings:homepage', { ok: true }, 300)
    setCache(`seller_${seller._id.toString()}:listings`, { ok: true }, 300)
    setCache('admin_analytics:overview', { ok: true }, 300)

    const adminToken = generateToken(admin as any)
    const res = await POST(
      authedJsonRequest(
        `http://localhost/api/admin/listings/${product._id.toString()}/boost`,
        adminToken,
        'POST',
        { action: 'boost' }
      ),
      { params: Promise.resolve({ id: product._id.toString() }) }
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(getCache('listings:homepage')).toBeUndefined()
    expect(getCache(`seller_${seller._id.toString()}:listings`)).toBeUndefined()
    expect(getCache('admin_analytics:overview')).toBeUndefined()
  }, 20000)
})
