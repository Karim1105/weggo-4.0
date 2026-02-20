import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getAuthUser } from '@/lib/auth'

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

const UPLOADS_ROOT = path.resolve(process.cwd(), 'public', 'uploads')

function isWithinUploads(candidate: string): boolean {
  return candidate === UPLOADS_ROOT || candidate.startsWith(`${UPLOADS_ROOT}${path.sep}`)
}

function isValidObjectId(value: string): boolean {
  return /^[a-f0-9]{24}$/i.test(value)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params

  // Reject path traversal attempts
  if (segments.some((s) => s === '..' || s === '.' || s.includes('\\'))) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const isIdDocumentPath = segments[0] === 'ids'
  if (isIdDocumentPath) {
    const ownerUserId = segments[1]
    if (!ownerUserId || !isValidObjectId(ownerUserId)) {
      return new NextResponse('Not Found', { status: 404 })
    }

    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const requesterId = user._id.toString()
    const isAdmin = user.role === 'admin'
    if (!isAdmin && requesterId !== ownerUserId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
  }

  const filePath = path.resolve(UPLOADS_ROOT, ...segments)

  // Ensure the resolved path is still inside public/uploads
  if (!isWithinUploads(filePath)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  try {
    await fs.promises.access(filePath, fs.constants.R_OK)
  } catch {
    return new NextResponse('Not Found', { status: 404 })
  }

  const ext = path.extname(filePath).toLowerCase()
  const contentType = MIME_TYPES[ext]
  if (!contentType) {
    return new NextResponse('Unsupported file type', { status: 400 })
  }

  const fileBuffer = await fs.promises.readFile(filePath)
  const stat = await fs.promises.stat(filePath)

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': stat.size.toString(),
      'Cache-Control': isIdDocumentPath ? 'private, no-store' : 'public, max-age=31536000, immutable',
      ...(isIdDocumentPath ? { Vary: 'Cookie' } : {}),
    },
  })
}
