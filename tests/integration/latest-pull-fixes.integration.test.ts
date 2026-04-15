import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { NextRequest } from 'next/server'

let mongo: MongoMemoryServer

const loadConnectDB = async () => import('@/lib/db')
const loadAuth = async () => import('@/lib/auth')
const loadUserModel = async () => import('@/models/User')
const loadProductModel = async () => import('@/models/Product')
const loadAdminListingRoute = async () => import('@/app/api/admin/listings/[id]/route')

function authedJsonRequest(
  url: string,
  token: string,
  method: 'PATCH',
  body?: Record<string, unknown>
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

describe('latest pull integration fixes', () => {
  it('does not allow visibility toggles to overwrite sold listing status', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()

    const User = (await loadUserModel()).default
    const Product = (await loadProductModel()).default
    const { generateToken } = await loadAuth()
    const { PATCH } = await loadAdminListingRoute()

    const admin = await User.create({
      name: 'Admin',
      email: 'latest-pull-admin@example.com',
      password: 'Aa123456',
      location: 'Cairo',
      role: 'admin',
    })

    const seller = await User.create({
      name: 'Seller',
      email: 'latest-pull-seller@example.com',
      password: 'Aa123456',
      location: 'Cairo',
    })

    const soldProduct = await Product.create({
      title: 'Already Sold',
      description: 'This should stay sold',
      price: 9000,
      category: 'electronics',
      condition: 'Good',
      location: 'Cairo',
      images: ['/uploads/sold.jpg'],
      seller: seller._id,
      status: 'sold',
    })

    const token = generateToken(admin as any)
    const res = await PATCH(
      authedJsonRequest(
        `http://localhost/api/admin/listings/${soldProduct._id.toString()}`,
        token,
        'PATCH',
        { visible: true }
      ),
      { params: Promise.resolve({ id: soldProduct._id.toString() }) }
    )
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.success).toBe(false)
    expect(json.error).toContain('Visibility can only be changed')

    const refreshed = await Product.findById(soldProduct._id).lean()
    expect(refreshed?.status).toBe('sold')
  }, 20000)
})
