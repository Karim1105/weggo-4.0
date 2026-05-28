'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ScrollText, ShieldCheck, Sparkles } from 'lucide-react'
import { useT } from '@/lib/i18n/useT'
import { categories as taxonomy } from '@/lib/taxonomy'

export default function Footer() {
  const year = new Date().getFullYear()
  const { t, isArabic } = useT()
  const footerCategories = ['electronics', 'furniture', 'vehicles', 'fashion', 'sports']
  const label = (id: string) => {
    const cat = taxonomy.find((c) => c.id === id)
    if (!cat) return id
    return isArabic ? cat.nameAr : cat.name
  }

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
              {t('footer.tagline')}
            </p>
            <div className="flex flex-wrap gap-2 text-xs font-medium text-gray-300">
              <span className="rounded-full bg-white/10 px-3 py-1.5">{t('footer.pillAiPricing')}</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5">{t('footer.pillTrustedSellers')}</span>
              <span className="rounded-full bg-white/10 px-3 py-1.5">{t('footer.pillLocalDiscovery')}</span>
            </div>
          </div>

          <div>
            <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">{t('footer.quickLinks')}</h3>
            <ul className="space-y-2 md:space-y-3 text-sm md:text-base">
              <li><Link href="/" className="text-gray-400 hover:text-white transition-colors">{t('footer.linkHome')}</Link></li>
              <li><Link href="/browse" className="text-gray-400 hover:text-white transition-colors">{t('footer.linkBrowse')}</Link></li>
              <li><Link href="/sell" className="text-gray-400 hover:text-white transition-colors">{t('footer.linkSell')}</Link></li>
              <li><Link href="/favorites" className="text-gray-400 hover:text-white transition-colors">{t('footer.linkFavorites')}</Link></li>
              <li><Link href="/support" className="text-gray-400 hover:text-white transition-colors">{t('footer.linkSupport')}</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">{t('footer.popularCategories')}</h3>
            <ul className="space-y-2 md:space-y-3 text-sm md:text-base">
              {footerCategories.map((id) => (
                <li key={id}>
                  <Link href={`/browse?category=${id}`} className="text-gray-400 hover:text-white transition-colors">
                    {label(id)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-base md:text-lg font-semibold mb-3 md:mb-4">{t('footer.standards')}</h3>
            <ul className="space-y-3 md:space-y-4 text-sm md:text-base">
              <li className="flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-400">{t('footer.standardCleaner')}</span>
              </li>
              <li className="flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-400">{t('footer.standardModeration')}</span>
              </li>
              <li className="flex items-start space-x-3">
                <ScrollText className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-400">{t('footer.standardDocs')}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 md:pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0">
            <p className="text-gray-400 text-sm">
              © {year} Weggo. {t('footer.rights')}
            </p>
            <div className="flex space-x-6 text-sm">
              <Link href="/support" className="text-gray-400 hover:text-white transition-colors">
                {t('footer.linkSupport')}
              </Link>
              <Link href="/seller-guidelines" className="text-gray-400 hover:text-white transition-colors">
                {t('footer.seller')}
              </Link>
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                {t('footer.privacy')}
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                {t('footer.terms')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
