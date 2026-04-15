'use client'

import { ReactNode } from 'react'
import { Shield, ToggleLeft, ToggleRight } from 'lucide-react'
import { useAdmin } from '@/hooks/useAdmin'
import { cn } from '@/lib/utils'

export interface AdminWrapperState {
  isAdmin: boolean
  role: 'admin' | 'user' | null
  initialViewEnabled: boolean
}

interface AdminWrapperProps {
  sectionLabel: string
  adminState: AdminWrapperState
  controls?: ReactNode
  children: ReactNode
}

export default function AdminWrapper({ sectionLabel, adminState, controls, children }: AdminWrapperProps) {
  const { canSeeControls, isAdmin, viewEnabled, toggleAdminView } = useAdmin(adminState)

  if (!isAdmin) {
    return <>{children}</>
  }

  return (
    <section className="relative">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          <Shield className="h-3.5 w-3.5" /> Admin section: {sectionLabel}
        </span>

        <button
          type="button"
          onClick={toggleAdminView}
          className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          title="Ctrl/Cmd + Shift + A"
        >
          {viewEnabled ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
          Admin view {viewEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className={cn('relative rounded-2xl', canSeeControls && 'ring-2 ring-indigo-200 ring-offset-2')}>
        {canSeeControls && controls ? <div className="absolute right-3 top-3 z-20">{controls}</div> : null}
        {children}
      </div>
    </section>
  )
}
