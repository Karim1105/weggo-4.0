import fs from 'fs/promises'
import path from 'path'
import { handleImageUpload } from '@/lib/imageUpload'

export async function uploadListingImages(formData: FormData, userId: string, productId: string): Promise<string[]> {
  const images = await handleImageUpload(formData, userId, productId)
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error('At least one image is required')
  }
  return images
}

export async function cleanupUploadedImages(imagePaths: string[]): Promise<void> {
  await Promise.all(
    imagePaths.map(async (imagePath) => {
      const uploadsRoot = path.resolve(process.cwd(), 'public', 'uploads')
      const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath
      const fullPath = path.resolve(process.cwd(), 'public', cleanPath)
      if (!fullPath.startsWith(uploadsRoot + path.sep)) return
      try {
        await fs.unlink(fullPath)
      } catch {
        return
      }
    })
  )
}
