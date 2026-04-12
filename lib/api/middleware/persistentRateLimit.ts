import mongoose from 'mongoose'
import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'

interface PersistentRateLimitOptions {
  namespace: string
  maxRequests: number
  windowMs: number
}

interface RateLimitDoc {
  key: string
  count: number
  expiresAt: Date
}

const schema = new mongoose.Schema<RateLimitDoc>(
  {
    key: { type: String, required: true, unique: true },
    count: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false }
)

schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

function getRateLimitModel() {
  return (
    (mongoose.models.ApiRateLimit as mongoose.Model<RateLimitDoc>) ||
    mongoose.model<RateLimitDoc>('ApiRateLimit', schema)
  )
}

function getRequestIp(request: NextRequest): string {
  return (request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown')
    .split(',')[0]
    .trim()
}

export async function applyPersistentRateLimit(
  request: NextRequest,
  options: PersistentRateLimitOptions
): Promise<NextResponse | null> {
  try {
    const ip = getRequestIp(request)
    const now = new Date()
    const resetAt = new Date(Date.now() + options.windowMs)
    const key = `${options.namespace}:${ip}`

    const RateLimitModel = getRateLimitModel()

    const activeRecord = await RateLimitModel.findOneAndUpdate(
      { key, expiresAt: { $gt: now } },
      { $inc: { count: 1 } },
      { returnDocument: 'after' }
    )

    if (!activeRecord) {
      await RateLimitModel.findOneAndUpdate(
        { key },
        { $set: { key, count: 1, expiresAt: resetAt } },
        { upsert: true }
      )
      return null
    }

    if (activeRecord.count > options.maxRequests) {
      return NextResponse.json(
        { success: false, error: 'Too many requests, please try again later' },
        { status: 429 }
      )
    }

    return null
  } catch {
    return rateLimit(options.maxRequests, options.windowMs)(request)
  }
}
