import { notFound } from 'next/navigation'
import { getServerAuthUser } from '@/lib/auth'

export async function requireAdminPageAccess() {
  // Check the role against the database, not the JWT claim, so a demoted or
  // banned admin loses access immediately instead of when the token expires.
  const user = await getServerAuthUser()
  if (!user || user.role !== 'admin' || user.banned) {
    notFound()
  }
}
