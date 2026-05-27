import crypto from 'crypto'
import WorkerLease from '@/models/WorkerLease'

const HOLDER_ID = crypto.randomUUID()

function isDuplicateKeyError(error: unknown) {
  return Boolean(error && typeof error === 'object' && (error as { code?: number }).code === 11000)
}

export async function acquireLease(name: string, ttlMs: number) {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + ttlMs)

  try {
    const lease = await WorkerLease.findOneAndUpdate(
      {
        name,
        $or: [
          { expiresAt: { $lte: now } },
          { holder: HOLDER_ID },
        ],
      },
      {
        $set: {
          holder: HOLDER_ID,
          expiresAt,
        },
      },
      {
        returnDocument: 'after',
        upsert: true,
      }
    )

    return lease?.holder === HOLDER_ID
  } catch (error) {
    // The upsert races an unexpired holder: filter matches no row, upsert
    // tries to insert with the same name, the unique index rejects with
    // E11000. That just means "someone else holds the lease right now" —
    // return false so the caller skips this tick instead of crashing.
    if (isDuplicateKeyError(error)) return false
    throw error
  }
}
