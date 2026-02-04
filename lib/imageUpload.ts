const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_LISTING_IMAGES = 10
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

const MAGIC: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/jpg': [0xff, 0xd8, 0xff],
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
}

function isAllowedImage(type: string, buffer: Buffer): boolean {
  const magic = MAGIC[type]
  if (!magic) return false
  if (buffer.length < magic.length) return false
  for (let i = 0; i < magic.length; i++) {
    if (buffer[i] !== magic[i]) return false
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

function toDataUri(type: string, buffer: Buffer): string {
  return `data:${type};base64,${buffer.toString('base64')}`
}

export async function saveImage(file: File, userId: string): Promise<string> {
  const buffer = await readAndValidateImage(file)
  return toDataUri(file.type, buffer)
}

export async function saveIdDocument(file: File, userId: string): Promise<string> {
  const buffer = await readAndValidateImage(file)
  return toDataUri(file.type, buffer)
}

export async function handleImageUpload(
  formData: FormData,
  userId: string
): Promise<string[]> {
  const files = formData.getAll('images') as File[]
  const imagePaths: string[] = []

  if (files.length > MAX_LISTING_IMAGES) {
    throw new Error(`Maximum ${MAX_LISTING_IMAGES} images per listing allowed.`)
  }

  for (const file of files) {
    if (file && file.size > 0) {
      const path = await saveImage(file, userId)
      imagePaths.push(path)
    }
  }

  return imagePaths
}


