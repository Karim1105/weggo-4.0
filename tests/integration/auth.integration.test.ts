import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { NextRequest } from 'next/server'

let mongo: MongoMemoryServer

const jsonRequest = (url: string, body: Record<string, any>) =>
  new NextRequest(url, {
    method: 'POST',
    headers: new Headers({ 'content-type': 'application/json' }),
    body: JSON.stringify(body),
  })

const loadRegister = async () => import('@/app/api/auth/register/route')
const loadLogin = async () => import('@/app/api/auth/login/route')

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

describe('auth integration', () => {
  it('registers and logs in a user', async () => {
    const { POST: register } = await loadRegister()
    const { POST: login } = await loadLogin()

    const regRes = await register(
      jsonRequest('http://localhost/api/auth/register', {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Aa123456',
        phone: '01234567890',
        location: 'Cairo',
      })
    )
    const regJson = await regRes.json()
    expect(regJson.success).toBe(true)

    const loginRes = await login(
      jsonRequest('http://localhost/api/auth/login', {
        email: 'test@example.com',
        password: 'Aa123456',
      })
    )
    const loginJson = await loginRes.json()
    expect(loginJson.success).toBe(true)
    expect(loginRes.status).toBe(200)
  })
})
