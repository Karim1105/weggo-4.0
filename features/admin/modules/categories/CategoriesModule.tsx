'use client'

import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { RefreshCw, TrendingUp } from 'lucide-react'
import { categories } from '@/lib/utils'
import { refreshPopularCategories, PopularCategoriesPayload } from '@/features/admin/services/admin-api'

export default function CategoriesModule() {
  const [query, setQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [popular, setPopular] = useState<PopularCategoriesPayload | null>(null)

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim()
    if (!normalized) return categories
    return categories.filter((item) => item.name.toLowerCase().includes(normalized) || item.nameAr.includes(normalized))
  }, [query])

  const categoryName = (slug: string) => categories.find((item) => item.id === slug)?.name || slug

  const handleRefreshTrending = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      const data = await refreshPopularCategories()
      setPopular(data)
      toast.success('Trending categories refreshed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to refresh trending')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <TrendingUp className="h-4 w-4 text-accent-600" />
              Trending Now (&ldquo;Popular This Week&rdquo;)
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              The homepage ranking is cached for 5 hours. Refresh to recompute it from current activity right now.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefreshTrending}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing…' : 'Refresh trending'}
          </button>
        </div>

        {popular && (
          <div className="mt-4 border-t pt-3">
            <p className="text-xs text-gray-500">
              Updated {new Date(popular.computedAt).toLocaleString()}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {popular.popular.length === 0 && (
                <span className="text-xs text-gray-400">No popular categories yet.</span>
              )}
              {popular.popular.map((slug, index) => (
                <span
                  key={slug}
                  className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-3 py-1 text-xs font-medium text-accent-700"
                >
                  #{index + 1} {categoryName(slug)}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="rounded-xl border bg-white p-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="Search category (EN / AR)"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((category) => (
          <article key={category.id} className="rounded-xl border bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">{category.name}</h3>
            <p className="mt-1 text-sm text-gray-500">{category.nameAr}</p>
            <p className="mt-3 text-xs text-gray-400">Slug: {category.id}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
