import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { NextRequest } from 'next/server'

let mongo: MongoMemoryServer

const loadConnectDB = async () => import('@/lib/db')
const loadUserModel = async () => import('@/models/User')
const loadProductModel = async () => import('@/models/Product')
const loadAuth = async () => import('@/lib/auth')
const loadCache = async () => import('@/lib/cache')
const loadService = async () => import('@/lib/popularCategories')
const loadPublicRoute = async () => import('@/app/api/categories/popular/route')
const loadAdminRoute = async () => import('@/app/api/admin/categories/popular/route')

function cookieRequest(url: string, token?: string, method: 'GET' | 'POST' = 'GET') {
  const headers = new Headers({ 'x-forwarded-for': '10.0.0.1' })
  if (token) headers.set('cookie', `token=${token}`)
  return new NextRequest(url, { method, headers })
}

async function seedProducts() {
  const Product = (await loadProductModel()).default
  const seller = new mongoose.Types.ObjectId()
  const now = Date.now()
  const recent = new Date(now - 2 * 24 * 60 * 60 * 1000) // within the week
  const old = new Date(now - 60 * 24 * 60 * 60 * 1000) // outside the week

  // Electronics: fresh + lots of views -> should rank first
  await Product.create({
    title: 'Hot phone', description: 'x', price: 100, category: 'Electronics',
    condition: 'Good', location: 'Cairo', images: ['/uploads/a.jpg'], seller,
    status: 'active', views: 500, createdAt: recent,
  })
  // Vehicles: moderate views, recent
  await Product.create({
    title: 'Used car', description: 'x', price: 100, category: 'vehicles',
    condition: 'Good', location: 'Cairo', images: ['/uploads/b.jpg'], seller,
    status: 'active', views: 80, createdAt: recent,
  })
  // Furniture: old, few views -> should rank low
  await Product.create({
    title: 'Old chair', description: 'x', price: 100, category: 'Furniture',
    condition: 'Good', location: 'Cairo', images: ['/uploads/c.jpg'], seller,
    status: 'active', views: 3, createdAt: old,
  })
  // Inactive should be ignored entirely
  await Product.create({
    title: 'Deleted gaming', description: 'x', price: 100, category: 'gaming',
    condition: 'Good', location: 'Cairo', images: ['/uploads/d.jpg'], seller,
    status: 'deleted', views: 9999, createdAt: recent,
  })
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongo.getUri()
  process.env.JWT_SECRET = 'test-secret'
})

beforeEach(async () => {
  const { clearCache } = await loadCache()
  clearCache()
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

describe('popular categories service', () => {
  it('ranks categories by recent activity and ignores inactive listings', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    await seedProducts()

    const { computePopularCategories } = await loadService()
    const result = await computePopularCategories()

    expect(result.popular[0]).toBe('electronics')
    expect(result.popular).toContain('vehicles')
    // Inactive gaming listing must not surface despite huge view count.
    expect(result.popular).not.toContain('gaming')
    // Electronics should outrank furniture.
    expect(result.scores.electronics).toBeGreaterThan(result.scores.furniture || 0)
  })

  it('collapses display-name and slug aliases onto the same slug', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const Product = (await loadProductModel()).default
    const seller = new mongoose.Types.ObjectId()
    const recent = new Date(Date.now() - 24 * 60 * 60 * 1000)

    await Product.create({
      title: 'A', description: 'x', price: 1, category: 'Electronics',
      condition: 'Good', location: 'Cairo', images: ['/uploads/a.jpg'], seller,
      status: 'active', views: 10, createdAt: recent,
    })
    await Product.create({
      title: 'B', description: 'x', price: 1, category: 'electronics',
      condition: 'Good', location: 'Cairo', images: ['/uploads/b.jpg'], seller,
      status: 'active', views: 10, createdAt: recent,
    })

    const { computePopularCategories } = await loadService()
    const result = await computePopularCategories()

    expect(result.popular).toEqual(['electronics'])
    expect(result.popular.filter((s) => s === 'electronics')).toHaveLength(1)
  })

  it('caches results for the configured TTL and refreshes on demand', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    await seedProducts()

    const { getPopularCategories, refreshPopularCategories, POPULAR_CATEGORIES_CACHE_KEY } = await loadService()
    const { getCache } = await loadCache()

    const first = await getPopularCategories()
    expect(getCache(POPULAR_CATEGORIES_CACHE_KEY)).toBeDefined()

    // A second read returns the cached payload (same computedAt timestamp).
    const second = await getPopularCategories()
    expect(second.computedAt).toBe(first.computedAt)

    // Refresh recomputes and writes a new cache entry.
    const refreshed = await refreshPopularCategories()
    expect(refreshed.computedAt).not.toBe(first.computedAt)
    const third = await getPopularCategories()
    expect(third.computedAt).toBe(refreshed.computedAt)
  })
})

describe('GET /api/categories/popular', () => {
  it('returns the cached ranking payload', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    await seedProducts()

    const { GET } = await loadPublicRoute()
    const res = await GET(cookieRequest('http://localhost/api/categories/popular'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(Array.isArray(json.data.popular)).toBe(true)
    expect(json.data.popular[0]).toBe('electronics')
    expect(typeof json.data.computedAt).toBe('string')
    // Internal scoring metrics must not leak to public consumers.
    expect(json.data.scores).toBeUndefined()
  })

  it('honours the limit query parameter', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    await seedProducts()

    const { GET } = await loadPublicRoute()
    const res = await GET(cookieRequest('http://localhost/api/categories/popular?limit=1'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.popular).toHaveLength(1)
    expect(json.data.popular[0]).toBe('electronics')
  })
})

describe('POST /api/admin/categories/popular', () => {
  it('rejects non-admins by hiding the endpoint (404)', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const User = (await loadUserModel()).default
    const { generateToken } = await loadAuth()

    const user = await User.create({
      name: 'Regular', email: 'user@example.com', password: 'Aa123456',
      role: 'user', location: 'Cairo',
    })
    const token = generateToken(user as any)

    const { POST } = await loadAdminRoute()
    const res = await POST(cookieRequest('http://localhost/api/admin/categories/popular', token, 'POST'))
    expect(res.status).toBe(404)
  })

  it('lets an admin force a refresh and returns the fresh ranking', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const User = (await loadUserModel()).default
    const { generateToken } = await loadAuth()
    await seedProducts()

    const admin = await User.create({
      name: 'Admin', email: 'admin@example.com', password: 'Aa123456',
      role: 'admin', location: 'Cairo',
    })
    const token = generateToken(admin as any)

    const { POST } = await loadAdminRoute()
    const res = await POST(cookieRequest('http://localhost/api/admin/categories/popular', token, 'POST'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.popular[0]).toBe('electronics')
    // Admins are trusted to see the full scoring breakdown.
    expect(json.data.scores).toBeDefined()

    // The refreshed payload must be the one now sitting in the cache.
    const { getCache } = await loadCache()
    const { POPULAR_CATEGORIES_CACHE_KEY } = await loadService()
    const cached = getCache<{ computedAt: string }>(POPULAR_CATEGORIES_CACHE_KEY)
    expect(cached?.computedAt).toBe(json.data.computedAt)
  })
})
