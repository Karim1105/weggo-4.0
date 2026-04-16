'use client'

import { Bell, Menu, RefreshCw } from 'lucide-react'

interface AdminTopbarProps {
  title: string
  subtitle: string
  unreadNotifications: number
  onRefresh: () => void
  refreshing: boolean
  onOpenSidebar: () => void
  onOpenNotifications: () => void
}

export function AdminTopbar({
  title,
  subtitle,
  unreadNotifications,
  onRefresh,
  refreshing,
  onOpenSidebar,
  onOpenNotifications,
}: AdminTopbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b bg-white/95 px-4 py-4 backdrop-blur lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <button onClick={onOpenSidebar} className="rounded-lg border p-2 text-gray-600 lg:hidden" aria-label="Open menu">
            <Menu className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Refresh
          </button>
          <button
            onClick={onOpenNotifications}
            className="relative rounded-lg border p-2 text-gray-600 hover:bg-gray-50"
            aria-label="Open notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadNotifications > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
