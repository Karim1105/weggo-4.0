import mongoose from 'mongoose'
import {
  ALLOWED_FRONTEND_SORT_KEYS,
  CursorKey,
  CursorPayload,
  SortConfig,
  SortDirection,
  SortField,
} from '@/lib/api/listings/types'

function asNumber(value: unknown): number {
  return typeof value === 'number' ? value : 0
}

function getCursorNumericValue(cursor: CursorPayload, key: CursorKey): number {
  return asNumber(cursor[key as keyof CursorPayload])
}

export function getSortConfigFromFrontend(sortParam: string | null, useTextScore: boolean): SortConfig {
  const sort: Record<string, 1 | -1 | { $meta: 'textScore' }> = { isBoosted: -1 }
  const fields: SortField[] = [{ key: 'isBoosted', direction: -1 }]

  if (useTextScore) {
    sort.relevanceScore = { $meta: 'textScore' }
    fields.push({ key: 'relevanceScore', direction: -1 })
  }

  const normalized = (sortParam || '').trim().toLowerCase()
  const tokens = normalized ? normalized.split(',') : []
  const seen = new Set<string>()

  tokens.forEach((token) => {
    const [keyRaw, directionRaw] = token.split(':').map((part) => part.trim())
    if (!keyRaw || !directionRaw || seen.has(keyRaw) || !ALLOWED_FRONTEND_SORT_KEYS.has(keyRaw)) {
      return
    }

    const direction: SortDirection | null =
      directionRaw === 'asc' || directionRaw === '1'
        ? 1
        : directionRaw === 'desc' || directionRaw === '-1'
          ? -1
          : null

    if (!direction) return

    const key = keyRaw as CursorKey
    sort[key] = direction
    fields.push({ key, direction })
    seen.add(keyRaw)
  })

  if (!seen.has('createdAt')) {
    sort.createdAt = -1
    fields.push({ key: 'createdAt', direction: -1 })
  }

  const idDirection = (sort.createdAt as SortDirection | undefined) || -1
  sort._id = idDirection
  fields.push({ key: '_id', direction: idDirection })

  return { sort, fields }
}

export function decodeCursor(value: string | null): CursorPayload | null {
  if (!value) return null

  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf8')
    const parsed = JSON.parse(decoded) as CursorPayload
    if (!parsed?._id || !parsed?.createdAt) return null
    if (!mongoose.Types.ObjectId.isValid(parsed._id)) return null
    if (Number.isNaN(new Date(parsed.createdAt).getTime())) return null
    return parsed
  } catch {
    return null
  }
}

type CursorSourceItem = {
  _id: string
  createdAt: Date | string
  isBoosted?: boolean | number
  relevanceScore?: number
  price?: number
  averageRating?: number
  ratingCount?: number
}

export function encodeCursor(item: CursorSourceItem, fields: SortField[]): string {
  const payload: Partial<CursorPayload> = {
    _id: String(item._id),
    createdAt: new Date(item.createdAt).toISOString(),
    isBoosted: Number(item.isBoosted || 0),
  }

  fields.forEach((field) => {
    if (field.key === '_id' || field.key === 'createdAt' || field.key === 'isBoosted') return
    const value = item[field.key]
    if (typeof value === 'number') {
      ;(payload as Record<string, number | string>)[field.key] = value
    }
  })

  return Buffer.from(JSON.stringify(payload)).toString('base64url')
}

export function buildCursorMatch(cursor: CursorPayload, fields: SortField[]): Record<string, unknown> {
  const cursorObjectId = new mongoose.Types.ObjectId(cursor._id)
  const cursorDate = new Date(cursor.createdAt)

  const orConditions = fields.map((field, index) => {
    const condition: Record<string, unknown> = {}

    for (let i = 0; i < index; i += 1) {
      const previous = fields[i]
      if (previous.key === '_id') {
        condition._id = cursorObjectId
      } else if (previous.key === 'createdAt') {
        condition.createdAt = cursorDate
      } else {
        condition[previous.key] = getCursorNumericValue(cursor, previous.key)
      }
    }

    const op = field.direction === 1 ? '$gt' : '$lt'
    if (field.key === '_id') {
      condition._id = { [op]: cursorObjectId }
    } else if (field.key === 'createdAt') {
      condition.createdAt = { [op]: cursorDate }
    } else {
      condition[field.key] = { [op]: getCursorNumericValue(cursor, field.key) }
    }

    return condition
  })

  return { $or: orConditions }
}
