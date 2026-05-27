// Next.js instrumentation hook: runs once per server process at boot.
// We use it to start the LanceDB sync worker's retry loop so failed outbox
// rows are drained even when no admin route is hit. The worker itself is
// gated by a Mongo lease (lib/workers/lease.ts), so it is safe to call from
// every replica — only one process holds the lease at a time.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  if (process.env.ENABLE_LANCEDB_SYNC_WORKER === 'false') return

  const { ensureLancedbSyncWorkerStarted } = await import('@/lib/workers/lancedb-sync')
  ensureLancedbSyncWorkerStarted()
}
