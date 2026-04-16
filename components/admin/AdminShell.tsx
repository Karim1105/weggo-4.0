'use client'

import { useState } from 'react'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { AdminNavConfigItem } from '@/features/admin/config/navigation'
import { AdminTabKey } from '@/features/admin/types'

interface AdminShellProps {
  items: AdminNavConfigItem[]
  activeTab: AdminTabKey
  onSelectTab: (tab: AdminTabKey) => void
  title: string
  subtitle: string
  onRefresh: () => void
  refreshing: boolean
  unreadNotifications: number
  onOpenNotifications: () => void
  children: React.ReactNode
}

export function AdminShell({
  items,
  activeTab,
  onSelectTab,
  title,
  subtitle,
  onRefresh,
  refreshing,
  unreadNotifications,
  onOpenNotifications,
  children,
}: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <AdminSidebar
        items={items}
        activeTab={activeTab}
        onSelect={onSelectTab}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="lg:pl-72">
        <AdminTopbar
          title={title}
          subtitle={subtitle}
          unreadNotifications={unreadNotifications}
          onRefresh={onRefresh}
          refreshing={refreshing}
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenNotifications={onOpenNotifications}
        />
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
