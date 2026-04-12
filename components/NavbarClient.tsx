'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Search, Heart, User, Plus, LayoutDashboard, Globe, LogIn, LogOut, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { revalidateNavbar } from '@/app/actions/auth'
import { useAppStore } from '@/lib/store'

// Type-safe user interface
interface NavbarUser {
  id: string
  name: string
  email: string
  avatar?: string
}

interface NavbarClientProps {
  initialUser: NavbarUser | null
  sellHref: '/sell' | '/admin'
}

export default function NavbarClient({ initialUser, sellHref }: NavbarClientProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [user, setUser] = useState<NavbarUser | null>(initialUser)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const language = useAppStore((state) => state.language)
  const setLanguage = useAppStore((state) => state.setLanguage)
  const router = useRouter()
  const pathname = usePathname()
  const isArabic = language === 'ar'

  const fetchUnreadMessages = useCallback(async () => {
    if (!user) {
      setUnreadMessages(0)
      return
    }

    try {
      const res = await fetch('/api/messages', { credentials: 'include' })
      const msgData = await res.json()
      if (msgData.success && Array.isArray(msgData.conversations)) {
        const totalUnread = msgData.conversations.reduce(
          (sum: number, c: { unreadCount?: number }) => sum + (c.unreadCount || 0),
          0
        )
        setUnreadMessages(totalUnread)
      } else {
        setUnreadMessages(0)
      }
    } catch {
      setUnreadMessages(0)
    }
  }, [user])

  const handleSearch = () => {
    const query = searchQuery.trim()
    if (!query) {
      router.push('/browse')
      return
    }
    router.push(`/browse?search=${encodeURIComponent(query)}`)
  }

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSearch()
    }
  }

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    fetchUnreadMessages()
  }, [user, pathname, fetchUnreadMessages])

  useEffect(() => {
    const handleUnreadUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ delta?: number }>
      const delta = customEvent.detail?.delta
      if (typeof delta === 'number') {
        setUnreadMessages((prev) => Math.max(0, prev + delta))
      } else {
        fetchUnreadMessages()
      }
    }

    window.addEventListener('messages:unread:update', handleUnreadUpdate)
    return () => window.removeEventListener('messages:unread:update', handleUnreadUpdate)
  }, [fetchUnreadMessages])

  useEffect(() => {
    document.documentElement.dir = isArabic ? 'rtl' : 'ltr'
    document.documentElement.lang = language
  }, [isArabic, language])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      setUser(null)
      setUnreadMessages(0)
      // Invalidate navbar cache so next refresh gets the logged-out version
      await revalidateNavbar()
      toast.success('Logged out successfully')
      // Force hard reload to clear all cached state
      window.location.href = '/'
    } catch (error) {
      toast.error('Logout failed')
    }
  }

  const toggleLanguage = () => {
    setLanguage(isArabic ? 'en' : 'ar')
  }

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-white/60 backdrop-blur-xl shadow-xl border-b border-white/10' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-24 min-h-[96px]">
          {/* Mobile Search Expandable - appears before logo when active */}
          <AnimatePresence>
            {isMobileSearchOpen && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '100%', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="md:hidden absolute left-4 right-24 flex items-center"
              >
                <div className="relative w-full">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder={isArabic ? "ابحث عن أي شيء..." : "Search for anything..."}
                    className="w-full pl-12 pr-12 py-3 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white backdrop-blur-sm shadow-lg"
                    autoFocus
                  />
                  <button
                    onClick={() => setIsMobileSearchOpen(false)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Logo */}
          <Link href="/" className={`inline-block shrink-0 leading-none transition-opacity duration-300 mr-2 md:mr-4 ${isMobileSearchOpen ? 'md:opacity-100 opacity-0' : 'opacity-100'}`}>
            <motion.div
              whileHover={{ scale: 1.05, rotate: 2 }}
              className="inline-block"
            >
              <img
                src="/weggo-logo.png"
                alt="Weggo logo"
                className="block h-17 md:h-12 w-auto object-contain"
              />
            </motion.div>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-[44rem] ml-2 md:ml-4 lg:ml-6 mr-6 lg:mr-8">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={isArabic ? "ابحث عن أي شيء..." : "Search for anything..."}
                className="w-full pl-12 pr-6 py-4 rounded-2xl border border-gray-200/50 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-300 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 text-lg"
              />
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <button
              onClick={toggleLanguage}
              className="flex items-center space-x-1 text-gray-700 hover:text-primary-600 transition-colors"
            >
              <Globe className="w-5 h-5" />
              <span className="text-sm font-medium">{isArabic ? 'EN' : 'عربي'}</span>
            </button>

            <Link
              href="/browse"
              className="group flex items-center space-x-2 border-2 border-primary-500/50 text-primary-600 px-6 py-3 rounded-2xl font-bold hover:bg-gradient-to-r hover:from-primary-50 hover:to-accent-50 transition-all hover:-translate-y-1 shadow-lg hover:shadow-xl"
            >
              <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>{isArabic ? 'تصفح' : 'Browse'}</span>
            </Link>

            {user ? (
              <>
                {sellHref === '/admin' ? (
                  <Link
                    href="/admin"
                    className="group flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-2xl font-bold hover:shadow-xl transition-all hover:-translate-y-1 shadow-lg"
                  >
                    <LayoutDashboard className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span>{isArabic ? 'لوحة التحكم' : 'Dashboard'}</span>
                  </Link>
                ) : (
                  <Link
                    href="/sell"
                    className="group flex items-center space-x-2 gradient-primary text-white px-6 py-3 rounded-2xl font-bold hover:shadow-xl transition-all hover:-translate-y-1 shadow-lg"
                  >
                    <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span>{isArabic ? 'بيع' : 'Sell'}</span>
                  </Link>
                )}

                <Link
                  href="/messages"
                  className="p-2.5 hover:bg-gray-100 rounded-full transition-colors relative"
                >
                  <MessageCircle className="w-6 h-6 text-gray-700" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-semibold">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </Link>

                <Link
                  href="/favorites"
                  className="p-2.5 hover:bg-gray-100 rounded-full transition-colors relative"
                >
                  <Heart className="w-6 h-6 text-gray-700" />
                </Link>

                <Link
                  href="/profile"
                  className="p-2.5 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <User className="w-6 h-6 text-gray-700" />
                </Link>

                <button
                  onClick={handleLogout}
                  className="p-2.5 hover:bg-gray-100 rounded-full transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-6 h-6 text-gray-700" />
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="group flex items-center space-x-2 border-2 border-primary-500 text-primary-600 px-6 py-3 rounded-2xl font-bold hover:bg-gradient-to-r hover:from-primary-50 hover:to-accent-50 transition-all hover:-translate-y-1 shadow-lg hover:shadow-xl"
                >
                  <LogIn className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Login</span>
                </Link>

                <Link
                  href="/register"
                  className="group flex items-center space-x-2 gradient-primary text-white px-6 py-3 rounded-2xl font-bold hover:shadow-xl transition-all hover:-translate-y-1 shadow-lg"
                >
                  <User className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Sign Up</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Actions - Search Icon + Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            <button
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {isMobileSearchOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Search className="w-6 h-6" />
              )}
            </button>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/10 bg-white/60 backdrop-blur-xl"
          >
            <div className="px-4 py-6 space-y-4">
              <Link
                href="/browse"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-center space-x-2 border-2 border-primary-500 text-primary-600 px-6 py-3 rounded-full font-semibold hover:bg-primary-50 transition-all"
              >
                <Search className="w-5 h-5" />
                <span>{isArabic ? 'تصفح' : 'Browse'}</span>
              </Link>

              {user ? (
                <>
                  {sellHref === '/admin' ? (
                    <Link
                      href="/admin"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-full font-semibold"
                    >
                      <LayoutDashboard className="w-5 h-5" />
                      <span>{isArabic ? 'لوحة التحكم' : 'Dashboard'}</span>
                    </Link>
                  ) : (
                    <Link
                      href="/sell"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center space-x-2 gradient-primary text-white px-6 py-3 rounded-full font-semibold"
                    >
                      <Plus className="w-5 h-5" />
                      <span>{isArabic ? 'بيع' : 'Sell'}</span>
                    </Link>
                  )}

                  <Link
                    href="/messages"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-between px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <span className="flex items-center space-x-3">
                      <MessageCircle className="w-5 h-5" />
                      <span>{isArabic ? 'الرسائل' : 'Messages'}</span>
                    </span>
                    {unreadMessages > 0 && (
                      <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                      </span>
                    )}
                  </Link>

                  <Link
                    href="/favorites"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Heart className="w-5 h-5" />
                    <span>{isArabic ? 'المفضلة' : 'Favorites'}</span>
                  </Link>

                  <Link
                    href="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <User className="w-5 h-5" />
                    <span>{isArabic ? 'الملف الشخصي' : 'Profile'}</span>
                  </Link>

                  <button
                    onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                    className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors w-full"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center space-x-2 border-2 border-primary-500 text-primary-600 px-6 py-3 rounded-full font-semibold hover:bg-primary-50 transition-all"
                  >
                    <LogIn className="w-5 h-5" />
                    <span>Login</span>
                  </Link>

                  <Link
                    href="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center justify-center space-x-2 gradient-primary text-white px-6 py-3 rounded-full font-semibold"
                  >
                    <User className="w-5 h-5" />
                    <span>Sign Up</span>
                  </Link>
                </>
              )}

              <button
                onClick={() => { toggleLanguage(); setIsMobileMenuOpen(false); }}
                className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-100 rounded-lg transition-colors w-full"
              >
                <Globe className="w-5 h-5" />
                <span>{isArabic ? 'English' : 'عربي'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {user && (
        <Link
          href="/messages"
          className="md:hidden fixed bottom-24 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          aria-label="Open messages"
        >
          <MessageCircle className="w-6 h-6" />
          {unreadMessages > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
              {unreadMessages > 9 ? '9+' : unreadMessages}
            </span>
          )}
        </Link>
      )}
    </motion.nav>
  )
}
