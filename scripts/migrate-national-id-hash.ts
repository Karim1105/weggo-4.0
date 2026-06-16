/**
 * Migration: hash existing plaintext national IDs.
 *
 * Production currently stores `nationalIdNumber` in plaintext on the users
 * collection. This script replaces it with `nationalIdHash` (peppered
 * HMAC-SHA256, see lib/nationalId.ts) and removes the plaintext field.
 *
 * Properties:
 *   - Idempotent: users that already have `nationalIdHash` and no plaintext are
 *     skipped, so it is safe to re-run.
 *   - Irreversible: hashing is one-way. Once plaintext is removed it cannot be
 *     recovered. Run with --dry-run first to preview.
 *
 * Prerequisites:
 *   - MONGODB_URI must point at the target database.
 *   - NATIONAL_ID_HASH_SECRET must be set to the SAME value the app uses
 *     (otherwise verification comparisons would never match post-migration).
 *
 * Usage:
 *   npm run migrate:national-id:dry     # preview, no writes
 *   npm run migrate:national-id         # apply
 */

import mongoose from 'mongoose'
import { hashNationalId, getNationalIdHashSecret } from '@/lib/nationalId'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/weggo'
const DRY_RUN = process.argv.includes('--dry-run')

async function migrate() {
  // Fail fast if the pepper is missing/weak before touching any data.
  getNationalIdHashSecret()

  console.log(`[national-id] ${DRY_RUN ? 'DRY RUN — no writes' : 'LIVE — will modify data'}`)
  console.log('[national-id] connecting to', MONGODB_URI)
  await mongoose.connect(MONGODB_URI)
  const users = mongoose.connection.db!.collection('users')

  // Anything still holding a plaintext national ID needs migrating.
  const cursor = users.find(
    { nationalIdNumber: { $exists: true, $ne: null } },
    { projection: { _id: 1, nationalIdNumber: 1, nationalIdHash: 1 } }
  )

  let scanned = 0
  let migrated = 0
  let skippedEmpty = 0
  let alreadyHashed = 0

  while (await cursor.hasNext()) {
    const user = (await cursor.next())!
    scanned++

    const plaintext = typeof user.nationalIdNumber === 'string' ? user.nationalIdNumber.trim() : ''

    if (!plaintext) {
      // Empty/garbage value: just drop the field, nothing meaningful to hash.
      skippedEmpty++
      if (!DRY_RUN) {
        await users.updateOne({ _id: user._id }, { $unset: { nationalIdNumber: '' } })
      }
      continue
    }

    const hash = hashNationalId(plaintext)

    if (user.nationalIdHash && user.nationalIdHash === hash) {
      // Already migrated with the same secret; just ensure plaintext is gone.
      alreadyHashed++
      if (!DRY_RUN) {
        await users.updateOne({ _id: user._id }, { $unset: { nationalIdNumber: '' } })
      }
      continue
    }

    if (!DRY_RUN) {
      await users.updateOne(
        { _id: user._id },
        { $set: { nationalIdHash: hash }, $unset: { nationalIdNumber: '' } }
      )
    }
    migrated++
    console.log(`  [${DRY_RUN ? 'WOULD MIGRATE' : 'MIGRATED'}] user ${user._id.toString()}`)
  }

  console.log('\n[national-id] summary')
  console.log(`  scanned:        ${scanned}`)
  console.log(`  migrated:       ${migrated}`)
  console.log(`  already hashed: ${alreadyHashed}`)
  console.log(`  empty cleared:  ${skippedEmpty}`)
  if (DRY_RUN) console.log('  (dry run — no changes were written)')

  await mongoose.disconnect()
}

migrate().catch((err) => {
  console.error('[national-id] migration failed:', err)
  process.exit(1)
})
