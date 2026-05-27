import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'

let mongo: MongoMemoryServer

const loadConnectDB = async () => import('@/lib/db')
const loadProductModel = async () => import('@/models/Product')
const loadSyncOutboxModel = async () => import('@/models/SyncOutbox')
const loadSyncHelpers = async () => import('@/lib/api/listings/sync')
const loadWorker = async () => import('@/lib/workers/lancedb-sync')
const loadPayloadHelpers = async () => import('@/lib/search/listing-payload')

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

describe('lancedb sync worker', () => {
  it('drains ready outbox rows and records the synced payload hash', async () => {
    const connectDB = (await loadConnectDB()).default
    const Product = (await loadProductModel()).default
    const SyncOutbox = (await loadSyncOutboxModel()).default
    const { queueListingForSync } = await loadSyncHelpers()
    const { drainListingSyncOutboxBatch } = await loadWorker()
    const { hashListingSourcePayload } = await loadPayloadHelpers()

    await connectDB()

    const product = await Product.create({
      title: 'Desk Chair',
      title_en: 'Desk Chair',
      title_ar: 'كرسي مكتب',
      description: 'Ergonomic chair',
      description_en: 'Ergonomic chair',
      description_ar: 'كرسي مريح',
      price: 3200,
      category: 'furniture',
      category_en: 'furniture',
      category_ar: 'أثاث',
      subcategory: 'chairs',
      subcategory_en: 'chairs',
      subcategory_ar: 'كراسي',
      condition: 'Good',
      condition_en: 'Good',
      condition_ar: 'جيد',
      location: 'Cairo',
      images: ['/uploads/chair.jpg'],
      seller: new mongoose.Types.ObjectId(),
      status: 'active',
      sourceLanguage: 'en',
      targetLanguage: 'ar',
      translationPayloadHash: hashListingSourcePayload({
        title: 'Desk Chair',
        description: 'Ergonomic chair',
        category: 'furniture',
        subcategory: 'chairs',
        condition: 'Good',
        price: 3200,
        averageRating: 0,
      } as any),
    })

    await queueListingForSync(product)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      upserted: [product._id.toString()],
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })))

    await drainListingSyncOutboxBatch()

    const outboxCount = await SyncOutbox.countDocuments()
    const updated = await Product.findById(product._id).lean()

    expect(outboxCount).toBe(0)
    expect(updated?.lancedbPayloadHash).toBeTruthy()
    expect(updated?.lancedbSyncedAt).toBeTruthy()
  }, 20000)
})
