import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { NextRequest } from 'next/server'

let mongo: MongoMemoryServer
const createdPaths = new Set<string>()

const loadUploadsRoute = async () => import('@/app/api/uploads/[...path]/route')
const loadUserModel = async () => import('@/models/User')
const loadAuth = async () => import('@/lib/auth')
const loadConnectDB = async () => import('@/lib/db')

async function writeTestFile(filePath: string, content = 'test-image') {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true })
  await fs.promises.writeFile(filePath, Buffer.from(content))
  createdPaths.add(filePath)
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

  for (const filePath of createdPaths) {
    await fs.promises.rm(filePath, { force: true }).catch(() => {})
    await fs.promises.rm(path.dirname(filePath), { recursive: true, force: true }).catch(() => {})
  }
  createdPaths.clear()
})

afterAll(async () => {
  if (mongoose.connection.readyState) {
    await mongoose.disconnect()
  }
  await mongo.stop()
})

describe('uploads integration', () => {
  it('allows public listing image access without authentication', async () => {
    const folder = `__vitest__-${Date.now()}`
    const filename = 'public-listing.jpg'
    const diskPath = path.join(process.cwd(), 'public', 'uploads', 'listings', folder, filename)
    await writeTestFile(diskPath)

    const { GET } = await loadUploadsRoute()
    const req = new NextRequest('http://localhost/api/uploads/listings/public-listing.jpg')
    const res = await GET(req, { params: { path: ['listings', folder, filename] } })

    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toContain('public')
  }, 15000)

  it('blocks unauthenticated access to ID documents', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const User = (await loadUserModel()).default

    const owner = await User.create({
      name: 'Owner',
      email: 'owner@example.com',
      password: 'Aa123456',
      location: 'Cairo',
    })

    const filename = 'id-doc.jpg'
    const diskPath = path.join(process.cwd(), 'public', 'uploads', 'ids', owner._id.toString(), filename)
    await writeTestFile(diskPath)

    const { GET } = await loadUploadsRoute()
    const req = new NextRequest('http://localhost/api/uploads/ids/private.jpg')
    const res = await GET(req, { params: { path: ['ids', owner._id.toString(), filename] } })

    expect(res.status).toBe(401)
  }, 15000)

  it('allows owner access but forbids other users for ID documents', async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
    const User = (await loadUserModel()).default
    const { generateToken } = await loadAuth()

    const owner = await User.create({
      name: 'Owner',
      email: 'owner2@example.com',
      password: 'Aa123456',
      location: 'Cairo',
    })
    const other = await User.create({
      name: 'Other',
      email: 'other2@example.com',
      password: 'Aa123456',
      location: 'Giza',
    })

    const filename = 'private-id.jpg'
    const diskPath = path.join(process.cwd(), 'public', 'uploads', 'ids', owner._id.toString(), filename)
    await writeTestFile(diskPath)

    const ownerToken = generateToken(owner as any)
    const otherToken = generateToken(other as any)

    const { GET } = await loadUploadsRoute()

    const ownerReq = new NextRequest('http://localhost/api/uploads/ids/owner.jpg', {
      headers: new Headers({ cookie: `token=${ownerToken}` }),
    })
    const ownerRes = await GET(ownerReq, { params: { path: ['ids', owner._id.toString(), filename] } })
    expect(ownerRes.status).toBe(200)
    expect(ownerRes.headers.get('Cache-Control')).toBe('private, no-store')
    expect(ownerRes.headers.get('Vary')).toBe('Cookie')

    const otherReq = new NextRequest('http://localhost/api/uploads/ids/owner.jpg', {
      headers: new Headers({ cookie: `token=${otherToken}` }),
    })
    const otherRes = await GET(otherReq, { params: { path: ['ids', owner._id.toString(), filename] } })
    expect(otherRes.status).toBe(403)
  }, 15000)
})
