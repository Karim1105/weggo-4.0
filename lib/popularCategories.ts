import Product from '@/models/Product'
import { categories as taxonomyCategories } from '@/lib/taxonomy'
import { getCache, setCache, deleteCache } from '@/lib/cache'

/**
 * "Popular This Week" computation for the homepage Categories section.
 *
 * The popular set used to be hardcoded. We now derive it from real marketplace
 * activity (recent listings + accumulated views + ratings) and cache the result
 * for 5 hours so the homepage stays fast and the score only moves a few times a
 * day. Admins can force a recompute from the dashboard.
 */

export const POPULAR_CATEGORIES_CACHE_KEY = 'categories:popular'
export const POPULAR_CATEGORIES_TTL_SECONDS = 5 * 60 * 60 // 5 hours
export const DEFAULT_POPULAR_LIMIT = 4

export interface PopularCategoriesResult {
  /** Ranked category slugs, most popular first. */
  popular: string[]
  /** Popularity score per slug (debug / admin visibility). */
  scores: Record<string, number>
  /** ISO timestamp of when the ranking was computed. */
  computedAt: string
}

// Build a lookup so categories stored by display name ("Electronics") or slug
// ("electronics") both collapse onto the canonical taxonomy slug.
const aliasToSlug = (() => {
  const map = new Map<string, string>()
  for (const category of taxonomyCategories) {
    map.set(category.id.toLowerCase(), category.id)
    map.set(category.name.toLowerCase(), category.id)
  }
  return map
})()

function resolveSlug(rawCategory: unknown): string | null {
  if (typeof rawCategory !== 'string') return null
  const normalized = rawCategory.trim().toLowerCase()
  if (!normalized) return null
  return aliasToSlug.get(normalized) || normalized
}

/**
 * Run the aggregation against MongoDB and return the ranked popular categories.
 * Callers are responsible for ensuring a DB connection is established.
 */
export async function computePopularCategories(limit: number = DEFAULT_POPULAR_LIMIT): Promise<PopularCategoriesResult> {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const grouped = await Product.aggregate<{
    _id: string
    totalViews: number
    recentCount: number
    count: number
    avgRating: number | null
  }>([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: '$category',
        totalViews: { $sum: { $ifNull: ['$views', 0] } },
        recentCount: { $sum: { $cond: [{ $gte: ['$createdAt', oneWeekAgo] }, 1, 0] } },
        count: { $sum: 1 },
        avgRating: { $avg: '$averageRating' },
      },
    },
  ])

  // Collapse aliases onto canonical slugs and accumulate scores.
  const scores: Record<string, number> = {}
  for (const row of grouped) {
    const slug = resolveSlug(row._id)
    if (!slug) continue

    // Weighted score: recent listings drive "this week", views capture demand,
    // inventory and rating act as gentle tie-breakers.
    const score =
      row.recentCount * 10 +
      (row.totalViews || 0) +
      row.count * 2 +
      (row.avgRating || 0) * 5

    scores[slug] = (scores[slug] || 0) + score
  }

  const popular = Object.entries(scores)
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([slug]) => slug)

  return {
    popular,
    scores,
    computedAt: new Date().toISOString(),
  }
}

/**
 * Cached read used by the public homepage. Computes and caches for 5h on a miss.
 */
export async function getPopularCategories(limit: number = DEFAULT_POPULAR_LIMIT): Promise<PopularCategoriesResult> {
  const cached = getCache<PopularCategoriesResult>(POPULAR_CATEGORIES_CACHE_KEY)
  if (cached) return cached

  const result = await computePopularCategories(limit)
  setCache(POPULAR_CATEGORIES_CACHE_KEY, result, POPULAR_CATEGORIES_TTL_SECONDS)
  return result
}

/**
 * Force a recompute and refresh the cache. Used by the admin "Refresh Trending"
 * action so changes show up immediately instead of waiting for the 5h TTL.
 */
export async function refreshPopularCategories(limit: number = DEFAULT_POPULAR_LIMIT): Promise<PopularCategoriesResult> {
  deleteCache(POPULAR_CATEGORIES_CACHE_KEY)
  const result = await computePopularCategories(limit)
  setCache(POPULAR_CATEGORIES_CACHE_KEY, result, POPULAR_CATEGORIES_TTL_SECONDS)
  return result
}
