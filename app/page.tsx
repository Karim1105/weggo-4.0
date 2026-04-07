import { cookies } from 'next/headers'
import Hero from '@/components/Hero'
import PersonalizedFeed from '@/components/PersonalizedFeed'
import Categories from '@/components/Categories'
import FeaturedListings from '@/components/FeaturedListings'
import HowItWorks from '@/components/HowItWorks'
import Footer from '@/components/Footer'
import RecentlyViewed from '@/components/RecentlyViewed'
import WishlistHydrator from '@/components/WishlistHydrator'
import { isAdminRole } from '@/lib/ui/role-ui'

async function getUserRole(): Promise<'user' | 'admin' | null> {
  try {
    const cookieStore = await cookies()
    const cookieHeader = cookieStore.toString()
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'GET',
      headers: {
        Cookie: cookieHeader,
      },
    })

    const data = await res.json()
    if (data.success && data.user) {
      return data.user.role === 'admin' ? 'admin' : 'user'
    }
  } catch {
    // Not authenticated
  }

  return null
}

export default async function Home() {
  const role = await getUserRole()

  return (
    <div className="relative">
      {/* Smooth Flowing Gradient Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/30 via-orange-50/20 to-red-50/15" />
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-yellow-50/15 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-bl from-orange-50/20 via-transparent to-amber-50/20" />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/40 via-blue-50/20 to-indigo-50/30" />
      </div>

      <WishlistHydrator />

      <Hero />
      
      {/* Seamless sections - no individual gradients */}
      <Categories />
      <PersonalizedFeed isAdmin={isAdminRole(role)} />
      <RecentlyViewed />
      <FeaturedListings />
      <HowItWorks />
      
      <Footer />
    </div>
  )
}

