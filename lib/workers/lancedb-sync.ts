import connectDB from '@/lib/db'
import { logger } from '@/lib/logger'
import Product from '@/models/Product'
import SyncOutbox, { type ISyncOutbox } from '@/models/SyncOutbox'
import { acquireLease } from '@/lib/workers/lease'
import { buildLancedbListingPayload, hasCompleteTranslations, hashLancedbPayload, hashListingSourcePayload } from '@/lib/search/listing-payload'
import { deleteLancedbListing, upsertLancedbListings } from '@/lib/search/lancedb-client'
import { ensureTranslated } from '@/lib/translation/pipeline'

const LEASE_TTL_MS = 30_000
const MAX_ATTEMPTS = 10
const RETRY_INTERVAL_MS = 5_000
const TRANSLATION_RETRY_MS = 5 * 60 * 1000
const SYNC_BATCH_LIMIT = 50

let intervalHandle: NodeJS.Timeout | null = null
let drainScheduled = false

function computeBackoff(attempts: number) {
  return Math.min(2 ** attempts, 600) * 1000
}

async function markRowsFailed(rows: ISyncOutbox[], error: unknown) {
  if (rows.length === 0) return

  const now = Date.now()
  await Promise.all(rows.map((row) => {
    const attempts = row.attempts + 1
    return SyncOutbox.updateOne(
      { _id: row._id },
      {
        $set: {
          attempts,
          lastError: error instanceof Error ? error.message : String(error),
          nextAttemptAt: new Date(now + computeBackoff(attempts)),
        },
      }
    )
  }))
}

async function handleDeletes(rows: ISyncOutbox[]) {
  for (const row of rows) {
    try {
      await deleteLancedbListing(row.productId.toString())
      await SyncOutbox.deleteOne({ _id: row._id })
    } catch (error) {
      await markRowsFailed([row], error)
    }
  }
}

async function handleUpserts(rows: ISyncOutbox[]) {
  if (rows.length === 0) return

  const products = await Product.find({
    _id: { $in: rows.map((row) => row.productId) },
  })

  const productMap = new Map(products.map((product) => [product._id.toString(), product]))
  const missingProductRows = rows.filter((row) => !productMap.has(row.productId.toString()))

  if (missingProductRows.length > 0) {
    await handleDeletes(missingProductRows)
  }

  const activeProducts = rows
    .map((row) => productMap.get(row.productId.toString()))
    .filter((product): product is NonNullable<typeof product> => Boolean(product) && product.status !== 'deleted')

  let translationAvailable = true
  try {
    await ensureTranslated(activeProducts)
  } catch (error) {
    translationAvailable = false
    logger.warn('Translation pipeline unavailable during sync drain', {
      service: 'translation',
      error: error instanceof Error ? error.message : String(error),
    })
  }

  const listingsToUpsert = []
  const syncedProducts = []
  const deferredRows: ISyncOutbox[] = []

  for (const row of rows) {
    const product = productMap.get(row.productId.toString())
    if (!product || product.status === 'deleted') continue

    const sourceHash = hashListingSourcePayload(product)
    const translationsReady = hasCompleteTranslations(product) && product.translationPayloadHash === sourceHash
    if (!translationAvailable && !translationsReady) {
      product.translationFailedAt = new Date()
    }

    const lancedbPayload = buildLancedbListingPayload(product)
    const lancedbHash = hashLancedbPayload(lancedbPayload)

    if (product.lancedbPayloadHash === lancedbHash && translationsReady && !product.translationFailedAt) {
      await SyncOutbox.deleteOne({ _id: row._id })
      continue
    }

    listingsToUpsert.push(lancedbPayload)
    syncedProducts.push({ lancedbHash, product, row, translationsReady })
  }

  if (listingsToUpsert.length === 0) return

  try {
    await upsertLancedbListings(listingsToUpsert)
  } catch (error) {
    await markRowsFailed(rows, error)
    return
  }

  const productBulkUpdates = []

  for (const entry of syncedProducts) {
    productBulkUpdates.push({
      updateOne: {
        filter: { _id: entry.product._id },
        update: {
          $set: {
            lancedbPayloadHash: entry.lancedbHash,
            lancedbSyncedAt: new Date(),
            translationFailedAt: entry.translationsReady ? null : entry.product.translationFailedAt ?? new Date(),
          },
        },
      },
    })

    if (entry.translationsReady) {
      await SyncOutbox.deleteOne({ _id: entry.row._id })
    } else {
      deferredRows.push(entry.row)
    }
  }

  if (productBulkUpdates.length > 0) {
    await Product.bulkWrite(productBulkUpdates)
  }

  if (deferredRows.length > 0) {
    await Promise.all(deferredRows.map((row) =>
      SyncOutbox.updateOne(
        { _id: row._id },
        {
          $set: {
            translationFailedAt: new Date(),
            nextAttemptAt: new Date(Date.now() + TRANSLATION_RETRY_MS),
            lastError: 'translation_unavailable',
          },
        }
      )
    ))
  }
}

export async function drainListingSyncOutboxBatch() {
  await connectDB()

  const hasLease = await acquireLease('lancedb-sync', LEASE_TTL_MS)
  if (!hasLease) return

  const rows = await SyncOutbox.find({
    state: 'ready',
    attempts: { $lt: MAX_ATTEMPTS },
    nextAttemptAt: { $lte: new Date() },
  })
    .sort({ nextAttemptAt: 1 })
    .limit(SYNC_BATCH_LIMIT)

  if (rows.length === 0) return

  const deleteRows = rows.filter((row) => row.op === 'delete')
  const upsertRows = rows.filter((row) => row.op === 'upsert')

  await handleUpserts(upsertRows)
  await handleDeletes(deleteRows)
}

export function kickLancedbSyncWorker() {
  if (drainScheduled) return
  drainScheduled = true

  setTimeout(() => {
    drainScheduled = false
    void drainListingSyncOutboxBatch().catch((error) => {
      logger.error('LanceDB sync drain failed', error, { service: 'lancedb-sync' })
    })
  }, 0).unref?.()
}

export function ensureLancedbSyncWorkerStarted() {
  if (intervalHandle || process.env.ENABLE_LANCEDB_SYNC_WORKER === 'false') return

  intervalHandle = setInterval(() => {
    void drainListingSyncOutboxBatch().catch((error) => {
      logger.error('Background LanceDB sync tick failed', error, { service: 'lancedb-sync' })
    })
  }, RETRY_INTERVAL_MS)

  intervalHandle.unref?.()
}
