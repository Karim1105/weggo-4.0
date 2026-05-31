'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Heart, MapPin, Clock, Sparkles } from 'lucide-react'
import { getProductCardActionVariant } from '@/lib/ui/role-ui'
import { Product } from '@/app/browse/types'
import ListingAdminMenu from '@/components/admin/ListingAdminMenu'
import { useT } from '@/lib/i18n/useT'

interface ProductCardProps {
  product: Product
  index?: number
  onToggleFavorite: (id: string) => void
  onOpenProduct?: (productId: string) => void
  isAdmin?: boolean
  adminControlsEnabled?: boolean
  onAdminUpdate?: (id: string, updates: Partial<Product>) => void
  onAdminRemove?: (id: string) => void
}

function formatPrice(value: number, locale: 'en' | 'ar') {
  try {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG').format(value)
  } catch {
    return value.toLocaleString()
  }
}

// Compact long absolute dates ("May 19, 2026" → "May 19") so the meta row
// doesn't crowd the location on narrow mobile cards. Relative formats
// ("1 day ago", "منذ يومين") pass through unchanged.
function compactPostedAt(value: string) {
  if (!value) return value
  const match = value.match(/^([A-Za-z]+ \d{1,2}),\s*\d{4}$/)
  return match ? match[1] : value
}

export default function ProductCard({
  product,
  onToggleFavorite,
  onOpenProduct,
  isAdmin = false,
  adminControlsEnabled = false,
  onAdminUpdate,
  onAdminRemove,
}: ProductCardProps) {
  const actionVariant = getProductCardActionVariant(isAdmin)
  const { t, locale, isArabic } = useT()

  const sellerLine = (() => {
    if (!product.seller) return null
    const parts: string[] = [product.seller.name.trim()]
    const meta: string[] = []
    if (typeof product.seller.rating === 'number' && product.seller.rating > 0) {
      meta.push(`★ ${product.seller.rating.toFixed(1)}`)
    }
    if (typeof product.seller.totalSales === 'number' && product.seller.totalSales > 0) {
      meta.push(`${product.seller.totalSales} ${isArabic ? 'بيعة' : 'sales'}`)
    }
    if (meta.length > 0) parts.push(meta.join(' · '))
    return parts.join(' — ')
  })()

  const priceLabel = `${formatPrice(product.price, locale)} ${isArabic ? 'ج.م' : 'EGP'}`
  const viewLabel = isArabic ? 'عرض' : 'View'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.06)] transition-shadow duration-200 hover:shadow-[0_10px_28px_rgba(15,23,42,0.10)]"
    >
      <Link
        href={`/listings/${product.id}`}
        className="flex h-full flex-col"
        onClick={() => onOpenProduct?.(product.id)}
      >
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 sm:aspect-square">
          <Image
            src={product.image}
            alt={product.title}
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]"
          />

          {/* Condition pill — top-start */}
          <div className="absolute start-2.5 top-2.5 rounded-full bg-sky-500/95 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-white shadow-sm backdrop-blur-sm sm:start-3 sm:top-3 sm:text-xs">
            {product.condition}
          </div>

          {/* Featured ribbon — bottom-start, only when present */}
          {product.isBoosted ? (
            <div className="absolute bottom-2.5 start-2.5 inline-flex items-center gap-1 rounded-full bg-amber-400/95 px-2.5 py-1 text-[0.7rem] font-semibold text-amber-900 shadow-sm backdrop-blur-sm sm:bottom-3 sm:start-3 sm:text-xs">
              <Sparkles className="h-3 w-3" aria-hidden />
              {isArabic ? 'مميز' : 'Featured'}
            </div>
          ) : null}

          {/* Action — top-end (heart for users, menu for admin) */}
          {actionVariant === 'admin-menu' && adminControlsEnabled ? (
            <div className="absolute end-2.5 top-2.5 sm:end-3 sm:top-3">
              <ListingAdminMenu product={product} onUpdate={onAdminUpdate} onRemove={onAdminRemove} />
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.94 }}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onToggleFavorite(product.id)
              }}
              aria-label={
                product.isFavorite
                  ? isArabic ? 'إزالة من المفضلة' : 'Remove from favorites'
                  : isArabic ? 'إضافة للمفضلة' : 'Add to favorites'
              }
              className="absolute end-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-md transition-colors hover:bg-white sm:end-3 sm:top-3 sm:h-10 sm:w-10"
            >
              <Heart
                className={`h-[1.05rem] w-[1.05rem] sm:h-5 sm:w-5 ${
                  product.isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-500'
                }`}
              />
            </motion.button>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-2.5 p-3 sm:gap-3 sm:p-4">
          {/* Title + category — title auto-direction for mixed AR/EN content */}
          <div className="flex flex-col gap-1">
            <span className="text-[0.68rem] font-medium uppercase tracking-wider text-slate-400">
              {product.category}
            </span>
            <h3
              dir="auto"
              className="line-clamp-2 min-h-[2.6rem] text-[0.95rem] font-semibold leading-snug text-slate-900 transition-colors group-hover:text-primary-600 sm:min-h-[2.8rem] sm:text-base"
            >
              {product.title}
            </h3>
          </div>

          {/* Meta — stacked on mobile so neither location nor date is
              truncated when both cards share a narrow row; inline on sm+ */}
          <div className="flex flex-col gap-1 text-xs text-slate-500 sm:flex-row sm:items-center sm:gap-3 sm:text-[0.8rem]">
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
              <span className="truncate">{product.location}</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden />
              <span className="whitespace-nowrap">{compactPostedAt(product.postedAt)}</span>
            </span>
          </div>

          {/* Seller — single subtle line, no boxed sub-card */}
          {sellerLine ? (
            <p
              dir="auto"
              className="truncate text-xs text-slate-500 sm:text-[0.8rem]"
              title={sellerLine}
            >
              {sellerLine}
            </p>
          ) : (
            <p className="text-xs text-transparent select-none" aria-hidden>—</p>
          )}

          {/* Footer — price + CTA. mt-auto pins to bottom regardless of body length */}
          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <p className="min-w-0 whitespace-nowrap text-[0.95rem] font-bold tracking-tight text-primary-600 sm:text-xl">
              {priceLabel}
            </p>
            <span className="inline-flex shrink-0 items-center rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 transition-colors group-hover:bg-primary-100 sm:px-4 sm:py-2 sm:text-sm">
              {viewLabel}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
