import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { NextRequest } from 'next/server'

let mongo: MongoMemoryServer

const loadListings = async () => import('@/app/api/listings/route')
const loadProductModel = async () => import('@/models/Product')
const loadUserModel = async () => import('@/models/User')
const loadConnectDB = async () => import('@/lib/db')
const loadAuth = async () => import('@/lib/auth')

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

  it('returns only authenticated user listings for seller=me and disables shared caching', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const Product = (await loadProductModel()).default
    const User = (await loadUserModel()).default
    const { generateToken } = await loadAuth()

    const me = await User.create({
      name: 'Me',
      email: 'me@example.com',
      password: 'Aa123456',
      location: 'Cairo',
    })
    const other = await User.create({
      name: 'Other',
      email: 'other@example.com',
      password: 'Aa123456',
      location: 'Giza',
    })

    await Product.create([
      {
        title: 'My Listing',
        description: 'My listing description',
        price: 100,
        category: 'electronics',
        condition: 'Good',
        location: 'Cairo',
        images: ['/uploads/my.jpg'],
        seller: me._id,
        status: 'active',
      },
      {
        title: 'Other Listing',
        description: 'Other listing description',
        price: 200,
        category: 'electronics',
        condition: 'Good',
        location: 'Giza',
        images: ['/uploads/other.jpg'],
        seller: other._id,
        status: 'active',
      },
    ])

    const token = generateToken(me as any)

    const { GET } = await loadListings()
    const req = new NextRequest('http://localhost/api/listings?seller=me&limit=50', {
      headers: new Headers({ cookie: `token=${token}` }),
    })
    const res = await GET(req)
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(json.data.listings.length).toBe(1)
    expect(json.data.listings[0].title).toBe('My Listing')
    expect(res.headers.get('Cache-Control')).toBe('private, no-store')
    expect(res.headers.get('Vary')).toBe('Cookie')
  }, 15000)

  it('handles location filters with regex special characters safely', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const Product = (await loadProductModel()).default

    await Product.create({
      title: 'Regex Safe Listing',
      description: 'Location contains parenthesis',
      price: 99,
      category: 'electronics',
      condition: 'Good',
      location: 'Cairo (West)',
      images: ['/uploads/test.jpg'],
      seller: new mongoose.Types.ObjectId(),
      status: 'active',
    })

    const { GET } = await loadListings()
    const req = new NextRequest(`http://localhost/api/listings?location=${encodeURIComponent('(')}&limit=10`)
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.listings.length).toBe(1)
    expect(json.data.listings[0].title).toBe('Regex Safe Listing')
  }, 15000)

  it('rejects excessively long location filters', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()

    const { GET } = await loadListings()
    const longLocation = 'x'.repeat(101)
    const req = new NextRequest(`http://localhost/api/listings?location=${longLocation}`)
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.success).toBe(false)
  }, 15000)
})
