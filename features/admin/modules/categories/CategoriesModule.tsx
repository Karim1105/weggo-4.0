'use client'

import { useMemo, useState } from 'react'
import { categories } from '@/lib/utils'

export default function CategoriesModule() {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim()
    if (!normalized) return categories
    return categories.filter((item) => item.name.toLowerCase().includes(normalized) || item.nameAr.includes(normalized))
  }, [query])

  return (
    <div className="space-y-4">
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
