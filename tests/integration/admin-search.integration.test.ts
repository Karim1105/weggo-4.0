import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { NextRequest } from 'next/server'

vi.mock('@/lib/elastic', async () => {
  const actual = await vi.importActual<typeof import('@/lib/elastic')>('@/lib/elastic')

  return {
    ...actual,
    elasticClient: {
      search: vi.fn(async () => {
        const error = new Error('Elasticsearch unavailable')
        ;(error as Error & { name: string; meta: { statusCode: number } }).name = 'ConnectionError'
        ;(error as Error & { name: string; meta: { statusCode: number } }).meta = { statusCode: 0 }
        throw error
      }),
    },
  }
})

let mongo: MongoMemoryServer

const loadConnectDB = async () => import('@/lib/db')
const loadAuth = async () => import('@/lib/auth')
const loadUserModel = async () => import('@/models/User')
const loadTicketModel = async () => import('@/models/Ticket')
const loadAdminUsersRoute = async () => import('@/app/api/admin/users/route')
const loadAdminTicketsRoute = async () => import('@/app/api/admin/tickets/route')

function authedJsonRequest(url: string, token: string) {
  return new NextRequest(url, {
    headers: new Headers({
      cookie: `token=${token}`,
      'x-forwarded-for': '10.1.0.1',
    }),
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

describe('admin search integration', () => {
  it('falls back to Mongo user search when Elasticsearch is unavailable', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const User = (await loadUserModel()).default
    const { generateToken } = await loadAuth()
    const { GET } = await loadAdminUsersRoute()

    const admin = await User.create({
      name: 'Admin',
      email: 'admin-search@example.com',
      password: 'Aa123456',
      location: 'Cairo',
      role: 'admin',
    })

    await User.create([
      {
        name: 'Alice Found',
        email: 'alice@example.com',
        password: 'Aa123456',
        location: 'Cairo',
      },
      {
        name: 'Bob Hidden',
        email: 'bob@example.com',
        password: 'Aa123456',
        location: 'Giza',
        banned: true,
      },
    ])

    const token = generateToken(admin as any)
    const res = await GET(authedJsonRequest('http://localhost/api/admin/users?search=alice&page=1&limit=10', token))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.users).toHaveLength(1)
    expect(json.data.users[0].email).toBe('alice@example.com')
  }, 20000)

  it('falls back to Mongo ticket search when Elasticsearch is unavailable', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const User = (await loadUserModel()).default
    const Ticket = (await loadTicketModel()).default
    const { generateToken } = await loadAuth()
    const { GET } = await loadAdminTicketsRoute()

    const admin = await User.create({
      name: 'Admin',
      email: 'admin-ticket-search@example.com',
      password: 'Aa123456',
      location: 'Cairo',
      role: 'admin',
    })

    const ticketUser = await User.create({
      name: 'Ticket User',
      email: 'ticket-user@example.com',
      password: 'Aa123456',
      location: 'Giza',
    })

    await Ticket.create([
      {
        userId: ticketUser._id,
        subject: 'Payment issue on listing purchase',
        message: 'I need help with a payment problem.',
        status: 'open',
      },
      {
        userId: ticketUser._id,
        subject: 'Shipping delay question',
        message: 'Delivery is delayed.',
        status: 'open',
      },
    ])

    const token = generateToken(admin as any)
    const res = await GET(authedJsonRequest('http://localhost/api/admin/tickets?search=payment&page=1&limit=10', token))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.tickets).toHaveLength(1)
    expect(json.data.tickets[0].subject).toContain('Payment issue')
  }, 20000)
})
