import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { NextRequest } from 'next/server'

let mongo: MongoMemoryServer

const loadListings = async () => import('@/app/api/listings/route')
const loadProductModel = async () => import('@/models/Product')
const loadConnectDB = async () => import('@/lib/db')

beforeAll(async () => {
  mongo = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongo.getUri()
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

describe('listings integration', () => {
  it('returns active listings', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const Product = (await loadProductModel()).default

    await Product.create({
      title: 'iPhone 14 Plus',
      description: 'Great condition',
      price: 15000,
      category: 'electronics',
      condition: 'Good',
      location: 'Cairo',
      images: ['/uploads/test.jpg'],
      seller: new mongoose.Types.ObjectId(),
      status: 'active',
    })

    const { GET } = await loadListings()
    const req = new NextRequest('http://localhost/api/listings?limit=10&sortBy=newest')
    const res = await GET(req)
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(json.data.listings.length).toBe(1)
    expect(json.data.listings[0].title).toBe('iPhone 14 Plus')
  }, 15000)
})
