'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ScrollText, ShieldCheck, Sparkles } from 'lucide-react'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-gray-900 text-white pt-10 md:pt-16 pb-6 md:pb-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-[1.3fr,1fr,1fr,1fr] md:gap-12 mb-8 md:mb-12">
          <div>
            <Link href="/" className="inline-flex items-center">
              <Image
                src="/weggo-logo.png"
                alt="Weggo logo"
                width={180}
                height={60}
                priority
                className="h-12 md:h-14 w-auto object-contain"
              />
            </Link>
            <p className="text-sm md:text-base text-gray-400 mb-4 md:mb-6">
              Egypt's smartest marketplace for buying and selling second-hand goods. Powered by AI.
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-medium text-gray-300">
              <span className="rounded-full bg-white/10 px-3 py-1.5">AI pricing</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5">Trusted sellers</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5">Local discovery</span>
            </div>
          </div>

          <div>
            <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Quick Links</h3>
            <ul className="space-y-2 md:space-y-3 text-sm md:text-base">
              <li><Link href="/" className="text-gray-400 hover:text-white transition-colors">Home</Link></li>
              <li><Link href="/browse" className="text-gray-400 hover:text-white transition-colors">Browse</Link></li>
              <li><Link href="/sell" className="text-gray-400 hover:text-white transition-colors">Sell</Link></li>
              <li><Link href="/favorites" className="text-gray-400 hover:text-white transition-colors">Favorites</Link></li>
              <li><Link href="/support" className="text-gray-400 hover:text-white transition-colors">Support</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Popular Categories</h3>
            <ul className="space-y-2 md:space-y-3 text-sm md:text-base">
              <li><Link href="/browse?category=electronics" className="text-gray-400 hover:text-white transition-colors">Electronics</Link></li>
              <li><Link href="/browse?category=furniture" className="text-gray-400 hover:text-white transition-colors">Furniture</Link></li>
              <li><Link href="/browse?category=vehicles" className="text-gray-400 hover:text-white transition-colors">Vehicles</Link></li>
              <li><Link href="/browse?category=fashion" className="text-gray-400 hover:text-white transition-colors">Fashion</Link></li>
              <li><Link href="/browse?category=sports" className="text-gray-400 hover:text-white transition-colors">Sports</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Marketplace Standards</h3>
            <ul className="space-y-3 md:space-y-4 text-sm md:text-base">
              <li className="flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-400">Cleaner listings, fairer pricing, and faster discovery for buyers and sellers.</span>
              </li>
              <li className="flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-400">Moderation, seller verification, and review workflows keep the marketplace tighter before launch.</span>
              </li>
              <li className="flex items-start space-x-3">
                <ScrollText className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-400">Need details? Use the support center, seller guidelines, and legal pages linked below.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 md:pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0">
            <p className="text-gray-400 text-sm">
              © {year} Weggo. All rights reserved. Made with ❤️ in Egypt
            </p>
            <div className="flex space-x-6 text-sm">
              <Link href="/support" className="text-gray-400 hover:text-white transition-colors">
                Support
              </Link>
              <Link href="/seller-guidelines" className="text-gray-400 hover:text-white transition-colors">
                Seller Guidelines
              </Link>
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
