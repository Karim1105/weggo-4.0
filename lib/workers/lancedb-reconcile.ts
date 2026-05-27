import connectDB from '@/lib/db'
import Product from '@/models/Product'
import { getExistingLancedbIds } from '@/lib/search/lancedb-client'
import { queueListingDeleteForSync, queueListingsUpsertForSync } from '@/lib/api/listings/sync'
import mongoose from 'mongoose'

const RECONCILE_BATCH_SIZE = 1_000

export async function reconcileLancedbIndex() {
  await connectDB()

  let cursor: string | null = null

  for (;;) {
    const query: Record<string, unknown> = cursor
      ? { status: 'active', _id: { $gt: new mongoose.Types.ObjectId(cursor) } }
      : { status: 'active' }

    const products: Array<{ _id: mongoose.Types.ObjectId }> = await Product.find(query)
      .sort({ _id: 1 })
      .limit(RECONCILE_BATCH_SIZE)
      .select('_id')
      .lean()

    if (products.length === 0) break

    const ids = products.map((product: { _id: mongoose.Types.ObjectId }) => product._id.toString())
    const existingIds = new Set(await getExistingLancedbIds(ids))
    const missingIds = ids.filter((id: string) => !existingIds.has(id))
    await queueListingsUpsertForSync(missingIds)

    cursor = products[products.length - 1]._id.toString()
  }
}

export async function queueReconcileDelete(listingId: string) {
  await queueListingDeleteForSync(listingId)
}
