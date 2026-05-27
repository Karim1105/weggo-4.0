import mongoose from 'mongoose'
import Product, { type IProduct } from '@/models/Product'
import SyncOutbox from '@/models/SyncOutbox'
import { hashListingSourcePayload } from '@/lib/search/listing-payload'

function buildDeletePayloadHash(productId: mongoose.Types.ObjectId | string) {
  return `delete:${productId.toString()}`
}

function isStandaloneTransactionError(error: unknown) {
  return error instanceof Error && (
    error.message.includes('Transaction numbers are only allowed on a replica set member or mongos') ||
    error.message.includes('transactions are not supported')
  )
}

export async function upsertListingSyncOutboxEntry(options: {
  op: 'upsert' | 'delete'
  payloadHash: string
  productId: mongoose.Types.ObjectId | string
  session?: mongoose.ClientSession
  state?: 'pending' | 'ready'
}) {
  const productId = typeof options.productId === 'string'
    ? new mongoose.Types.ObjectId(options.productId)
    : options.productId

  await SyncOutbox.findOneAndUpdate(
    { productId },
    {
      $set: {
        op: options.op,
        payloadHash: options.payloadHash,
        state: options.state ?? 'ready',
        nextAttemptAt: new Date(),
        lastError: undefined,
        translationFailedAt: null,
      },
      $setOnInsert: {
        attempts: 0,
      },
    },
    {
      returnDocument: 'after',
      upsert: true,
      session: options.session,
    }
  )
}

export async function queueListingForSync(product: Pick<IProduct, '_id' | 'title' | 'description' | 'category' | 'subcategory' | 'condition' | 'price' | 'averageRating'>) {
  await upsertListingSyncOutboxEntry({
    productId: product._id,
    op: 'upsert',
    payloadHash: hashListingSourcePayload(product),
  })
}

export async function queueListingDeleteForSync(productId: mongoose.Types.ObjectId | string) {
  await upsertListingSyncOutboxEntry({
    productId,
    op: 'delete',
    payloadHash: buildDeletePayloadHash(productId),
  })
}

export async function queueListingsDeleteForSync(productIds: Array<mongoose.Types.ObjectId | string>) {
  await Promise.all(productIds.map((productId) => queueListingDeleteForSync(productId)))
}

export async function queueListingsUpsertForSync(productIds: Array<mongoose.Types.ObjectId | string>) {
  if (productIds.length === 0) return

  const objectIds = productIds.map((productId) => (
    typeof productId === 'string' ? new mongoose.Types.ObjectId(productId) : productId
  ))
  const products = await Product.find({ _id: { $in: objectIds } })
    .select('title description category subcategory condition price averageRating')
    .lean()

  await Promise.all(products.map((product) => queueListingForSync(product as Pick<IProduct, '_id' | 'title' | 'description' | 'category' | 'subcategory' | 'condition' | 'price' | 'averageRating'>)))
}

export async function createListingWithSyncOutbox(input: {
  category: string
  condition: string
  description: string
  images: string[]
  location: string
  price: number
  productId: mongoose.Types.ObjectId
  sellerId: mongoose.Types.ObjectId
  subcategory?: string
  title: string
}) {
  const payload = {
    _id: input.productId,
    title: input.title,
    description: input.description,
    category: input.category,
    subcategory: input.subcategory,
    condition: input.condition,
    price: input.price,
    location: input.location,
    images: input.images,
    seller: input.sellerId,
  }

  const payloadHash = hashListingSourcePayload({
    title: input.title,
    description: input.description,
    category: input.category,
    subcategory: input.subcategory,
    condition: input.condition,
    price: input.price,
    averageRating: 0,
  })

  const session = await mongoose.startSession()

  try {
    await session.withTransaction(async () => {
      await Product.create([payload], { session })
      await upsertListingSyncOutboxEntry({
        productId: input.productId,
        op: 'upsert',
        payloadHash,
        session,
      })
    })
    return
  } catch (error) {
    if (!isStandaloneTransactionError(error)) {
      throw error
    }
  } finally {
    await session.endSession()
  }

  await upsertListingSyncOutboxEntry({
    productId: input.productId,
    op: 'upsert',
    payloadHash,
    state: 'pending',
  })

  try {
    await Product.create(payload)
    await SyncOutbox.updateOne(
      { productId: input.productId, state: 'pending' },
      {
        $set: {
          state: 'ready',
          nextAttemptAt: new Date(),
        },
      }
    )
  } catch (error) {
    await SyncOutbox.deleteOne({ productId: input.productId, state: 'pending' })
    throw error
  }
}
