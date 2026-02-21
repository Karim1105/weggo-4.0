'use client'

import Link from 'next/link'
import { Facebook, Instagram, Twitter, Mail, MapPin, Phone } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white pt-10 md:pt-16 pb-6 md:pb-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 mb-8 md:mb-12">
          {/* Brand */}
          <div>
            <h2 className="-mb-3 md:-mb-4">
              <img
                src="/weggo-logo.png"
                alt="Weggo logo"
                className="h-28 md:h-32 w-auto object-contain"
              />
            </h2>
            <p className="text-sm md:text-base text-gray-400 mb-4 md:mb-6">
              Egypt's smartest marketplace for buying and selling second-hand goods. Powered by AI.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Quick Links</h3>
            <ul className="space-y-2 md:space-y-3 text-sm md:text-base">
              <li><Link href="/" className="text-gray-400 hover:text-white transition-colors">Home</Link></li>
              <li><Link href="/browse" className="text-gray-400 hover:text-white transition-colors">Browse</Link></li>
              <li><Link href="/sell" className="text-gray-400 hover:text-white transition-colors">Sell</Link></li>
              <li><Link href="/about" className="text-gray-400 hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/blog" className="text-gray-400 hover:text-white transition-colors">Blog</Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Popular Categories</h3>
            <ul className="space-y-2 md:space-y-3 text-sm md:text-base">
              <li><Link href="/category/electronics" className="text-gray-400 hover:text-white transition-colors">Electronics</Link></li>
              <li><Link href="/category/furniture" className="text-gray-400 hover:text-white transition-colors">Furniture</Link></li>
              <li><Link href="/category/vehicles" className="text-gray-400 hover:text-white transition-colors">Vehicles</Link></li>
              <li><Link href="/category/fashion" className="text-gray-400 hover:text-white transition-colors">Fashion</Link></li>
              <li><Link href="/category/sports" className="text-gray-400 hover:text-white transition-colors">Sports</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Contact Us</h3>
            <ul className="space-y-3 md:space-y-4 text-sm md:text-base">
              <li className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-primary-400 flex-shrink-0 mt-1" />
                <span className="text-gray-400">Cairo, Egypt<br />New Cairo District</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-primary-400 flex-shrink-0" />
                <span className="text-gray-400">+20 123 456 7890</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-primary-400 flex-shrink-0" />
                <span className="text-gray-400">hello@weggo.eg</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 md:pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0">
            <p className="text-gray-400 text-sm">
              © 2025 Weggo. All rights reserved. Made with ❤️ in Egypt
            </p>
            <div className="flex space-x-6 text-sm">
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="/help" className="text-gray-400 hover:text-white transition-colors">
                Help Center
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
