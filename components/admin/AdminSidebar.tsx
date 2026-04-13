'use client'

import { AdminNavConfigItem } from '@/features/admin/config/navigation'
import { AdminTabKey } from '@/features/admin/types'
import { cn } from '@/lib/utils'

interface AdminSidebarProps {
  items: AdminNavConfigItem[]
  activeTab: AdminTabKey
  onSelect: (tab: AdminTabKey) => void
  open: boolean
  onClose: () => void
}

export function AdminSidebar({ items, activeTab, onSelect, open, onClose }: AdminSidebarProps) {
  return (
    <>
      <aside className={cn('fixed inset-y-0 left-0 z-40 w-72 border-r bg-white p-4 transition-transform lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="mb-6 border-b pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Weggo Admin</p>
          <h2 className="mt-2 text-xl font-semibold text-gray-900">Control Center</h2>
        </div>

        <nav className="space-y-1" aria-label="Admin navigation">
          {items.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.key
            return (
              <button
                key={item.key}
                onClick={() => {
                  onSelect(item.key)
                  onClose()
                }}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition',
                  isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className={cn('block text-xs', isActive ? 'text-indigo-100' : 'text-gray-500')}>
                    {item.description}
                  </span>
                </span>
              </button>
            )
          })}
        </nav>
      </aside>

      {open && <button aria-label="Close sidebar" onClick={onClose} className="fixed inset-0 z-30 bg-black/30 lg:hidden" />}
    </>
  )
}
