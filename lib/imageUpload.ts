import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_TOTAL_FILE_SIZE = 20 * 1024 * 1024 // 20MB
const MAX_LISTING_IMAGES = 10
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

const MAGIC: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/jpg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
}

// The stored extension is derived from the verified type, never from the
// client-supplied filename, so an upload can't be saved as .html/.svg.
const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

const SAFE_PATH_SEGMENT = /^[A-Za-z0-9_-]{1,64}$/

function isAllowedImage(type: string, buffer: Buffer): boolean {
  const magic = MAGIC[type]
  if (!magic) return false
  if (buffer.length < magic.length) return false
  for (let i = 0; i < magic.length; i++) {
    if (buffer[i] !== magic[i]) return false
  }
  // RIFF is a generic container; require the WEBP form type as well.
  if (type === 'image/webp') {
    return buffer.length >= 12 && buffer.toString('ascii', 8, 12) === 'WEBP'
  }
  return true
}

async function readAndValidateImage(file: File): Promise<Buffer> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.')
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 5MB limit.')
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  if (!isAllowedImage(file.type, buffer)) {
    throw new Error('File content does not match its type. Only real images are allowed.')
  }

  return buffer
}

async function writeFilePublic(buffer: Buffer, destPath: string) {
  await fs.promises.mkdir(path.dirname(destPath), { recursive: true })
  await fs.promises.writeFile(destPath, buffer)
}

export async function saveImage(file: File, userId: string, productId?: string): Promise<string> {
  const buffer = await readAndValidateImage(file)

  if (!SAFE_PATH_SEGMENT.test(userId) || (productId !== undefined && !SAFE_PATH_SEGMENT.test(productId))) {
    throw new Error('Invalid upload path')
  }

  const uploadsBase = path.join(process.cwd(), 'public', 'uploads', 'listings', userId)
  // If productId provided, save in subfolder for that product
  const uploadsDir = productId ? path.join(uploadsBase, productId) : uploadsBase
  const ext = EXTENSION_BY_TYPE[file.type]
  const imageId = randomUUID()
  const filename = `${imageId}${ext}`
  const dest = path.join(uploadsDir, filename)

  // Write to filesystem; on any error throw so callers don't fallback to data URIs
  await writeFilePublic(buffer, dest)
  return `/uploads/listings/${encodeURIComponent(userId)}/${productId ? encodeURIComponent(productId) + '/' : ''}${encodeURIComponent(filename)}`
}

export async function handleImageUpload(
  formData: FormData,
  userId: string,
  productId?: string
): Promise<string[]> {
  const files = formData.getAll('images') as File[]
  const imagePaths: string[] = []

  if (files.length > MAX_LISTING_IMAGES) {
    throw new Error(`You can upload up to ${MAX_LISTING_IMAGES} images per listing.`)
  }

  const totalSize = files.reduce((sum, file) => sum + (file?.size || 0), 0)
  if (totalSize > MAX_TOTAL_FILE_SIZE) {
    throw new Error('Total image size is too large. Maximum combined size is 20MB.')
  }

  for (const file of files) {
    if (file && file.size > 0) {
      // saveImage now requires productId if you want images grouped under product
      const p = await saveImage(file, userId, productId)
      // ensure we never return data URIs
      if (p.startsWith('data:')) {
        throw new Error('Invalid image save result')
      }
      imagePaths.push(p)
    }
  }

  return imagePaths
}

