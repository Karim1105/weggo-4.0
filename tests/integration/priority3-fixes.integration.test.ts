import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { NextRequest } from 'next/server'

let mongo: MongoMemoryServer

const loadConnectDB = async () => import('@/lib/db')
const loadUserModel = async () => import('@/models/User')
const loadProductModel = async () => import('@/models/Product')
const loadNearbyRoute = async () => import('@/app/api/listings/nearby/route')

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

describe('priority 3 fixes integration', () => {
  it('nearby listings only returns matched nearby cities and does not default unknown locations to Cairo', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const User = (await loadUserModel()).default
    const Product = (await loadProductModel()).default
    const { GET } = await loadNearbyRoute()

    const seller = await User.create({
      name: 'Seller',
      email: 'nearby-seller@example.com',
      password: 'Aa123456',
      location: 'Cairo',
    })

    await Product.create([
      {
        title: 'Nearby Camera',
        description: 'Close to Cairo',
        price: 500,
        category: 'electronics',
        condition: 'Good',
        location: 'Cairo',
        images: ['/uploads/cairo.jpg'],
        seller: seller._id,
        status: 'active',
      },
      {
        title: 'Far Desk',
        description: 'Far away in Alexandria',
        price: 800,
        category: 'furniture',
        condition: 'Good',
        location: 'Alexandria',
        images: ['/uploads/alex.jpg'],
        seller: seller._id,
        status: 'active',
      },
      {
        title: 'Unknown Town Item',
        description: 'Unknown location that should not be treated as Cairo',
        price: 300,
        category: 'books',
        condition: 'Good',
        location: 'Mystery Village',
        images: ['/uploads/unknown.jpg'],
        seller: seller._id,
        status: 'active',
      },
    ])

    const req = new NextRequest('http://localhost/api/listings/nearby?lat=30.0444&lon=31.2357&radius=50&limit=10')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.listings.map((listing: any) => listing.title)).toEqual(['Nearby Camera'])
  }, 20000)
})
