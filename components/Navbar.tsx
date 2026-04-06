import { cookies } from 'next/headers'
import NavbarClient from './NavbarClient'

interface NavbarUser {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
  avatar?: string
}

async function getUser(): Promise<NavbarUser | null> {
  try {
    const cookieStore = await cookies()
    const cookieHeader = cookieStore.toString()

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Cookie': cookieHeader,
      },
      // Default caching - Next.js will cache this by default (reduces traffic)
      // Cache is invalidated by revalidateNavbar() server action on login/logout
    })

    const data = await res.json()
    if (data.success && data.user) {
      return data.user as NavbarUser
    }
  } catch (error) {
    // Not authenticated
  }

  return null
}

export default async function Navbar() {
  const user = await getUser()
  const isAdmin = user?.role === 'admin' || false

  return <NavbarClient initialUser={user} isAdmin={isAdmin} />
}
