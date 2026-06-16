import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { NextRequest } from 'next/server'

let mongo: MongoMemoryServer

const VALID_ID = '29001010123456' // 1990-01-01, governorate 01, age >= 18
const SECRET = 'test-national-id-pepper-0123456789'

const loadConnectDB = async () => import('@/lib/db')
const loadUserModel = async () => import('@/models/User')
const loadAuth = async () => import('@/lib/auth')
const loadNationalId = async () => import('@/lib/nationalId')
const loadUploadRoute = async () => import('@/app/api/auth/upload-id/route')

function authedJson(url: string, token: string, body: Record<string, any>) {
  const headers = new Headers({ cookie: `token=${token}`, 'content-type': 'application/json' })
  return new NextRequest(url, { method: 'POST', headers, body: JSON.stringify(body) })
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongo.getUri()
  process.env.JWT_SECRET = 'test-secret'
})

beforeEach(() => {
  process.env.NATIONAL_ID_HASH_SECRET = SECRET
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

describe('national ID hashing', () => {
  it('is deterministic and does not reveal the plaintext', async () => {
    const { hashNationalId } = await loadNationalId()
    const a = hashNationalId(VALID_ID)
    const b = hashNationalId(VALID_ID)
    expect(a).toBe(b)
    expect(a).not.toContain(VALID_ID)
    expect(a).toMatch(/^[0-9a-f]{64}$/) // hex SHA-256
  })

  it('normalizes surrounding whitespace', async () => {
    const { hashNationalId } = await loadNationalId()
    expect(hashNationalId(`  ${VALID_ID}  `)).toBe(hashNationalId(VALID_ID))
  })

  it('produces different hashes under different secrets (peppered)', async () => {
    const { hashNationalId } = await loadNationalId()
    process.env.NATIONAL_ID_HASH_SECRET = SECRET
    const withFirst = hashNationalId(VALID_ID)
    process.env.NATIONAL_ID_HASH_SECRET = 'a-completely-different-secret-value'
    const withSecond = hashNationalId(VALID_ID)
    expect(withFirst).not.toBe(withSecond)
  })

  it('throws when the secret is missing or too weak', async () => {
    const { hashNationalId } = await loadNationalId()
    delete process.env.NATIONAL_ID_HASH_SECRET
    expect(() => hashNationalId(VALID_ID)).toThrow(/NATIONAL_ID_HASH_SECRET/)
    process.env.NATIONAL_ID_HASH_SECRET = 'short'
    expect(() => hashNationalId(VALID_ID)).toThrow(/NATIONAL_ID_HASH_SECRET/)
  })

  it('matches with a constant-time comparison helper', async () => {
    const { hashNationalId, nationalIdHashMatches } = await loadNationalId()
    const hash = hashNationalId(VALID_ID)
    expect(nationalIdHashMatches(VALID_ID, hash)).toBe(true)
    expect(nationalIdHashMatches('29001010199999', hash)).toBe(false)
    expect(nationalIdHashMatches(VALID_ID, 'not-a-real-hash')).toBe(false)
  })
})

describe('POST /api/auth/upload-id', () => {
  it('stores only the hash, never the plaintext national ID', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const User = (await loadUserModel()).default
    const { generateToken } = await loadAuth()
    const { hashNationalId } = await loadNationalId()

    const user = await User.create({
      name: 'Seller', email: 'seller@example.com', password: 'Aa123456', location: 'Cairo',
    })
    const token = generateToken(user as any)

    const { POST } = await loadUploadRoute()
    const res = await POST(authedJson('http://localhost/api/auth/upload-id', token, { nationalIdNumber: VALID_ID }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)

    // nationalIdHash has select:false, so request it explicitly. Read the raw
    // document to assert the plaintext field is absent entirely.
    const raw = await User.collection.findOne({ _id: user._id })
    expect(raw?.nationalIdHash).toBe(hashNationalId(VALID_ID))
    expect(raw?.nationalIdNumber).toBeUndefined()
    expect(raw?.sellerVerified).toBe(true)
  })

  it('rejects an invalid national ID without writing anything', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const User = (await loadUserModel()).default
    const { generateToken } = await loadAuth()

    const user = await User.create({
      name: 'Seller2', email: 'seller2@example.com', password: 'Aa123456', location: 'Cairo',
    })
    const token = generateToken(user as any)

    const { POST } = await loadUploadRoute()
    const res = await POST(authedJson('http://localhost/api/auth/upload-id', token, { nationalIdNumber: '12345' }))
    expect(res.status).toBe(400)

    const raw = await User.collection.findOne({ _id: user._id })
    expect(raw?.nationalIdHash).toBeUndefined()
    expect(raw?.sellerVerified).toBeFalsy()
  })
})
