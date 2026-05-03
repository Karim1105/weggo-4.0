import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { verifyToken } from '@/lib/auth'

export async function requireAdminPageAccess() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  if (!token) {
    notFound()
  }

  const payload = verifyToken(token)
  if (!payload || payload.role !== 'admin') {
    notFound()
  }
}
