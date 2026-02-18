/**
 * Migration script: Convert data URI images in products to filesystem files.
 *
 * For every product whose `images` array contains `data:...` entries,
 * this script will:
 *   1. Decode the base64 payload.
 *   2. Write the file to public/uploads/listings/<sellerId>/<productId>/<uuid>.<ext>
 *   3. Replace the data URI in the DB with the new file path.
 *
 * Usage:  npx ts-node --skip-project scripts/migrate-images.ts
 *    or:  npx tsx scripts/migrate-images.ts
 */

import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/weggo'

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

async function migrate() {
  console.log('Connecting to', MONGODB_URI)
  await mongoose.connect(MONGODB_URI)
  const db = mongoose.connection.db!

  const products = await db
    .collection('products')
    .find({})
    .project({ _id: 1, seller: 1, images: 1 })
    .toArray()

  let migrated = 0

  for (const product of products) {
    const images: string[] = product.images || []
    let changed = false
    const newImages: string[] = []

    for (const img of images) {
      if (typeof img === 'string' && img.startsWith('data:')) {
        // Parse data URI:  data:<mime>;base64,<payload>
        const match = img.match(/^data:(image\/\w+);base64,(.+)$/)
        if (!match) {
          console.warn(`  [SKIP] Product ${product._id}: unrecognised data URI format`)
          newImages.push(img)
          continue
        }

        const mime = match[1]
        const base64 = match[2]
        const ext = MIME_TO_EXT[mime] || '.bin'
        const buffer = Buffer.from(base64, 'base64')

        const sellerId = product.seller.toString()
        const productId = product._id.toString()
        const imageId = randomUUID()
        const filename = `${imageId}${ext}`

        const dir = path.join(process.cwd(), 'public', 'uploads', 'listings', sellerId, productId)
        await fs.promises.mkdir(dir, { recursive: true })
        await fs.promises.writeFile(path.join(dir, filename), buffer)

        const urlPath = `/uploads/listings/${sellerId}/${productId}/${filename}`
        newImages.push(urlPath)
        changed = true

        console.log(`  [OK] Product ${productId}: wrote ${filename} (${(buffer.length / 1024).toFixed(1)} KB)`)
      } else {
        newImages.push(img)
      }
    }

    if (changed) {
      await db.collection('products').updateOne(
        { _id: product._id },
        { $set: { images: newImages } }
      )
      migrated++
    }
  }

  console.log(`\nDone. Migrated ${migrated} product(s).`)
  await mongoose.disconnect()
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
