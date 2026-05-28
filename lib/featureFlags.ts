import connectDB from '@/lib/db'
import SystemSetting, { SYSTEM_SETTING_KEYS } from '@/models/SystemSetting'

const CACHE_TTL_MS = 10_000

interface CacheEntry {
  value: boolean
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

async function readBooleanFlag(key: string, defaultValue: boolean): Promise<boolean> {
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  await connectDB()
  const row = await SystemSetting.findOne({ key }).lean<{ value: unknown } | null>()
  const value = typeof row?.value === 'boolean' ? row.value : defaultValue
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
  return value
}

export function invalidateFeatureFlag(key: string) {
  cache.delete(key)
}

export async function isAiChatbotEnabled(): Promise<boolean> {
  return readBooleanFlag(SYSTEM_SETTING_KEYS.aiChatbotEnabled, true)
}

export async function setAiChatbotEnabled(enabled: boolean, updatedBy?: string) {
  await connectDB()
  await SystemSetting.findOneAndUpdate(
    { key: SYSTEM_SETTING_KEYS.aiChatbotEnabled },
    { $set: { value: enabled, updatedBy } },
    { upsert: true, new: true }
  )
  invalidateFeatureFlag(SYSTEM_SETTING_KEYS.aiChatbotEnabled)
}
