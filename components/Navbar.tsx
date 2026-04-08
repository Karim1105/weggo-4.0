import { cookies } from 'next/headers'
import NavbarClient from './NavbarClient'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/db'
import User from '@/models/User'
import { getNavbarSellHref } from '@/lib/ui/role-ui'

interface NavbarUser {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
  avatar?: string
}

interface NavbarProps {
  role?: 'user' | 'admin' | null
}

async function getUser(): Promise<NavbarUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('token')?.value

    if (!token) return null

    const payload = verifyToken(token)
    if (!payload) return null

    await connectDB()
    const user = await User.findById(payload.userId)
      .select('name email role avatar')
      .lean()

    if (!user) return null

    return {
      id: String((user as any)._id),
      name: String((user as any).name ?? ''),
      email: String((user as any).email ?? ''),
      role: (user as any).role === 'admin' ? 'admin' : 'user',
      avatar: (user as any).avatar ?? undefined,
    }
  } catch (error) {
    // Not authenticated
  }

  return null
}

export default async function Navbar({ role = null }: NavbarProps) {
  const user = await getUser()
  const sellHref = getNavbarSellHref(role, user?.role)

  return <NavbarClient initialUser={user} sellHref={sellHref} />
}
