import mongoose from 'mongoose'
import { drainListingSyncOutboxBatch } from '@/lib/workers/lancedb-sync'
import { reconcileLancedbIndex } from '@/lib/workers/lancedb-reconcile'

async function main() {
  console.log('[reconcile] scanning Mongo for active listings missing from LanceDB…')
  await reconcileLancedbIndex()
  console.log('[reconcile] enqueue complete; attempting to drain sync outbox…')

  for (let i = 0; i < 200; i += 1) {
    const before = Date.now()
    try {
      await drainListingSyncOutboxBatch()
    } catch (error) {
      console.log('[reconcile] drain attempt errored, will let live worker handle it:', (error as Error).message)
      break
    }
    const elapsed = Date.now() - before
    console.log(`[reconcile] drain pass ${i + 1} done in ${elapsed}ms`)

    const remaining = await mongoose.connection.db?.collection('listing_sync_outbox').countDocuments()
    console.log(`[reconcile] outbox depth: ${remaining ?? 'unknown'}`)
    if (!remaining) break
    await new Promise((resolve) => setTimeout(resolve, 1_000))
  }

  await mongoose.disconnect()
  console.log('[reconcile] done')
}

main().catch((error) => {
  console.error('[reconcile] failed:', error)
  process.exit(1)
})
