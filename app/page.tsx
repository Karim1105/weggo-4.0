import Hero from '@/components/Hero'
import PersonalizedFeed from '@/components/PersonalizedFeed'
import Categories from '@/components/Categories'
import FeaturedListings from '@/components/FeaturedListings'
import HowItWorks from '@/components/HowItWorks'
import Footer from '@/components/Footer'
import RecentlyViewed from '@/components/RecentlyViewed'
import WishlistHydrator from '@/components/WishlistHydrator'
export default function Home() {

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
      <PersonalizedFeed />
      <RecentlyViewed />
      <FeaturedListings />
      <HowItWorks />
      
      <Footer />
    </div>
  )
}

