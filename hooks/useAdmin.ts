'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { withCsrfHeader } from '@/lib/utils'

export type AdminRole = 'admin' | 'moderator' | 'user' | null

interface UseAdminOptions {
  isAdmin: boolean
  role: AdminRole
  initialViewEnabled: boolean
}

export function useAdmin({ isAdmin, role, initialViewEnabled }: UseAdminOptions) {
  const [viewEnabled, setViewEnabled] = useState(initialViewEnabled)
  const storageKey = 'admin:view-enabled'

  useEffect(() => {
    if (!isAdmin || typeof window === 'undefined') return

    const stored = window.localStorage.getItem(storageKey)
    if (stored === '1') setViewEnabled(true)
    if (stored === '0') setViewEnabled(false)
  }, [isAdmin])

  const persistViewMode = useCallback(async (nextEnabled: boolean) => {
    setViewEnabled(nextEnabled)

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, nextEnabled ? '1' : '0')
    }

    try {
      await fetch('/api/admin/view-mode', {
        method: 'POST',
        credentials: 'include',
        headers: withCsrfHeader({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ enabled: nextEnabled }),
      })
    } catch {
      // Keep local preference even if request fails
    }
  }, [])

  const toggleAdminView = useCallback(() => {
    if (!isAdmin) return
    void persistViewMode(!viewEnabled)
  }, [isAdmin, persistViewMode, viewEnabled])

  useEffect(() => {
    if (!isAdmin) return

    const onKeyDown = (event: KeyboardEvent) => {
      const isShortcut = (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'a'
      if (!isShortcut) return
      event.preventDefault()
      void persistViewMode(!viewEnabled)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isAdmin, persistViewMode, viewEnabled])

  const canSeeControls = useMemo(() => isAdmin && viewEnabled, [isAdmin, viewEnabled])

  return {
    role,
    isAdmin,
    viewEnabled,
    canSeeControls,
    toggleAdminView,
  }
}
