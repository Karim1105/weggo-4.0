import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const segments = params.path

  // Reject path traversal attempts
  if (segments.some((s) => s === '..' || s === '.' || s.includes('\\'))) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const filePath = path.join(process.cwd(), 'public', 'uploads', ...segments)

  // Ensure the resolved path is still inside public/uploads
  const uploadsRoot = path.join(process.cwd(), 'public', 'uploads')
  if (!filePath.startsWith(uploadsRoot)) {
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
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
