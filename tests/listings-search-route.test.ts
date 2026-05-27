import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { NextRequest } from 'next/server'

let mongo: MongoMemoryServer

const loadConnectDB = async () => import('@/lib/db')
const loadProductModel = async () => import('@/models/Product')
const loadSearchRoute = async () => import('@/app/api/listings/search/route')

beforeAll(async () => {
  mongo = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongo.getUri()
  process.env.JWT_SECRET = 'test-secret'
  process.env.LANCEDB_API_URL = 'http://lancedb.internal:5000'
})

afterEach(async () => {
  vi.restoreAllMocks()
  if (mongoose.connection.readyState) {
    await mongoose.connection.dropDatabase()
  }
})

afterAll(async () => {
  delete process.env.LANCEDB_API_URL
  if (mongoose.connection.readyState) {
    await mongoose.disconnect()
  }
  await mongo.stop()
})

describe('listings search route', () => {
  it('hydrates LanceDB-ranked ids from Mongo and preserves order while excluding inactive listings', async () => {
    const connectDB = (await loadConnectDB()).default
    const Product = (await loadProductModel()).default
    const { GET } = await loadSearchRoute()

    await connectDB()

    const seller = new mongoose.Types.ObjectId()
    const active = await Product.create({
      title: 'Ranked Second',
      description: 'second result',
      price: 200,
      category: 'electronics',
      condition: 'Good',
      location: 'Cairo',
      images: ['/uploads/second.jpg'],
      seller,
      status: 'active',
    })
    const inactive = await Product.create({
      title: 'Should be filtered',
      description: 'inactive result',
      price: 300,
      category: 'electronics',
      condition: 'Good',
      location: 'Cairo',
      images: ['/uploads/inactive.jpg'],
      seller,
      status: 'sold',
    })
    const first = await Product.create({
      title: 'Ranked First',
      description: 'first result',
      price: 100,
      category: 'electronics',
      condition: 'Excellent',
      location: 'Giza',
      images: ['/uploads/first.jpg'],
      seller,
      status: 'active',
    })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      results: [first._id.toString(), inactive._id.toString(), active._id.toString()],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })))

    const response = await GET(new NextRequest('http://localhost/api/listings/search?query=phone&locale=en'))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.listings).toHaveLength(2)
    expect(json.data.listings[0].title).toBe('Ranked First')
    expect(json.data.listings[1].title).toBe('Ranked Second')
    expect(json.data.listings.some((listing: { title: string }) => listing.title === 'Should be filtered')).toBe(false)
  }, 20000)
})
