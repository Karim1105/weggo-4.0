import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import SavedSearch from '@/models/SavedSearch'
import { isValidObjectId } from 'mongoose'

const MAX_SAVED_SEARCHES = 50
const MAX_PARAMS = 20
const PARAM_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,39}$/

async function handler(request: NextRequest, user: any) {
  await connectDB()

  if (request.method === 'GET') {
    const searches = await SavedSearch.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    return NextResponse.json({ success: true, searches })
  }

  if (request.method === 'POST') {
    const body = await request.json()
    const { name, params } = body || {}

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      )
    }
    if (!params || typeof params !== 'object' || Array.isArray(params)) {
      return NextResponse.json(
        { success: false, error: 'Params are required' },
        { status: 400 }
      )
    }

    // Keys become document field names, so reject `$`/`.` operators and cap sizes.
    const safeParams: Record<string, string> = {}
    for (const [k, v] of Object.entries(params).slice(0, MAX_PARAMS)) {
      if (PARAM_KEY_PATTERN.test(k) && typeof v === 'string' && v.trim()) {
        safeParams[k] = v.slice(0, 200)
      }
    }

    const existingCount = await SavedSearch.countDocuments({ user: user._id })
    if (existingCount >= MAX_SAVED_SEARCHES) {
      return NextResponse.json(
        { success: false, error: `You can save up to ${MAX_SAVED_SEARCHES} searches` },
        { status: 400 }
      )
    }

    const search = await SavedSearch.create({
      user: user._id,
      name: name.trim().slice(0, 80),
      params: safeParams,
    })

    return NextResponse.json({ success: true, search })
  }

  if (request.method === 'DELETE') {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id || !isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: 'A valid id is required' },
        { status: 400 }
      )
    }
    await SavedSearch.deleteOne({ _id: id, user: user._id })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  )
}

export const GET = requireAuth(handler)
export const POST = requireAuth(handler)
export const DELETE = requireAuth(handler)

