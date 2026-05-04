'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Heart, MapPin, Clock } from 'lucide-react'
import { getProductCardActionVariant } from '@/lib/ui/role-ui'
import { Product } from '@/app/browse/types'
import ListingAdminMenu from '@/components/admin/ListingAdminMenu'

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.992 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -3 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className="group relative h-full cursor-pointer overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
    >
      <Link
        href={`/listings/${product.id}`}
        className="flex h-full flex-col"
        onClick={() => onOpenProduct?.(product.id)}
      >
        <div className="relative aspect-square overflow-hidden">
          <img
            src={product.image}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/90 via-white/30 to-transparent" />

          {actionVariant === 'admin-menu' && adminControlsEnabled ? (
            <div className="absolute right-3 top-3">
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
              aria-label={product.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-[0_8px_18px_rgba(15,23,42,0.12)] transition-colors hover:bg-white"
            >
              <Heart
                className={`h-5 w-5 transition-colors ${
                  product.isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-500'
                }`}
              />
            </motion.button>
          )}

          <div className="absolute left-3 top-3 rounded-full bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
            {product.condition}
          </div>

          <div className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
            {product.category}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="min-h-[3.5rem]">
            <h3 className="line-clamp-2 text-[1.05rem] font-semibold leading-7 text-slate-900 transition-colors group-hover:text-primary-600">
              {product.title}
            </h3>
          </div>

          <div className="mt-3 min-h-[3.25rem] space-y-2 text-sm text-slate-600">
            <div className="flex items-center">
              <MapPin className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
              <span className="line-clamp-1">{product.location}</span>
            </div>
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
              <span>{product.postedAt}</span>
            </div>
          </div>

          {product.seller ? (
            <div className="mt-4 min-h-[4.35rem] rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
              <p className="line-clamp-2 min-h-[2.8rem] text-sm font-semibold leading-6 text-slate-700">
                {product.seller.name}
              </p>
              <div className="mt-1 min-h-[1rem] text-xs text-slate-500">
                {product.seller.rating != null || product.seller.totalSales != null ? (
                  <span>
                    {product.seller.rating != null ? `${product.seller.rating} rating` : ''}
                    {product.seller.rating != null && product.seller.totalSales != null ? ' · ' : ''}
                    {product.seller.totalSales != null ? `${product.seller.totalSales} sales` : ''}
                  </span>
                ) : (
                  <span>&nbsp;</span>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4 min-h-[4.35rem] rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
              <p className="min-h-[2.8rem] text-sm font-semibold leading-6 text-slate-400">Seller unavailable</p>
              <div className="mt-1 min-h-[1.25rem] text-xs text-slate-400">&nbsp;</div>
            </div>
          )}

          <div className="mt-5 flex min-h-[3.25rem] items-end justify-between gap-3">
            <div className="min-h-[3.25rem]">
              <p className="text-[1.9rem] font-bold leading-none tracking-tight text-primary-600">
                {product.price.toLocaleString()} EGP
              </p>
            </div>
            <div className="flex min-h-[3.25rem] items-end gap-2">
              <div className="min-w-[5.5rem] text-right">
                {isAdmin && product.isBoosted ? (
                  <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                    Featured
                  </span>
                ) : (
                  <span className="inline-block h-[1.75rem] w-[5.5rem]" aria-hidden="true" />
                )}
              </div>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-primary-700 transition-colors group-hover:bg-primary-50">
                View
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
