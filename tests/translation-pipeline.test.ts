import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'

vi.mock('@/lib/translation/client', () => ({
  translateListings: vi.fn(),
}))

let mongo: MongoMemoryServer

const loadProductModel = async () => import('@/models/Product')
const loadTranslationCacheModel = async () => import('@/models/TranslationCache')
const loadPipeline = async () => import('@/lib/translation/pipeline')
const loadClient = async () => import('@/lib/translation/client')
const loadConnectDB = async () => import('@/lib/db')

beforeAll(async () => {
  mongo = await MongoMemoryServer.create()
  process.env.MONGODB_URI = mongo.getUri()
  process.env.JWT_SECRET = 'test-secret'
})

afterEach(async () => {
  vi.restoreAllMocks()
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

describe('translation pipeline', () => {
  beforeEach(async () => {
    const connectDB = (await loadConnectDB()).default
    await connectDB()
  })

  it('translates stale products, persists bilingual fields, and writes translation cache rows', async () => {
    const Product = (await loadProductModel()).default
    const TranslationCache = (await loadTranslationCacheModel()).default
    const { ensureTranslated } = await loadPipeline()
    const { translateListings } = await loadClient()

    vi.mocked(translateListings).mockResolvedValue([
      {
        _sourceLanguage: 'en',
        _targetLanguage: 'ar',
        title_en: 'Gaming Laptop',
        title_ar: 'لابتوب ألعاب',
        description_en: 'Excellent battery life',
        description_ar: 'بطارية ممتازة',
        category_en: 'electronics',
        category_ar: 'إلكترونيات',
        subcategory_en: 'laptops',
        subcategory_ar: 'لابتوبات',
        condition_en: 'Excellent',
        condition_ar: 'ممتاز',
      },
    ])

    const product = await Product.create({
      title: 'Gaming Laptop',
      description: 'Excellent battery life',
      price: 25000,
      category: 'electronics',
      subcategory: 'laptops',
      condition: 'Excellent',
      location: 'Cairo',
      images: ['/uploads/laptop.jpg'],
      seller: new mongoose.Types.ObjectId(),
      status: 'active',
    })

    await ensureTranslated([product])

    const updated = await Product.findById(product._id).lean()
    expect(updated?.title_ar).toBe('لابتوب ألعاب')
    expect(updated?.description_ar).toBe('بطارية ممتازة')
    expect(updated?.translationPayloadHash).toBeTruthy()

    const cacheCount = await TranslationCache.countDocuments()
    expect(cacheCount).toBeGreaterThan(0)
    expect(translateListings).toHaveBeenCalledTimes(1)
  })
})
