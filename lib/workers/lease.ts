import crypto from 'crypto'
import WorkerLease from '@/models/WorkerLease'

const HOLDER_ID = crypto.randomUUID()

export async function acquireLease(name: string, ttlMs: number) {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + ttlMs)

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
}
