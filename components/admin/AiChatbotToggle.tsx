'use client'

import { useEffect, useState } from 'react'
import { Bot, BotOff, Loader2 } from 'lucide-react'

function getCsrfToken(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

export function AiChatbotToggle() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/feature-flags/ai-chatbot', { credentials: 'same-origin', cache: 'no-store' })
      .then((res) => res.json())
      .then((payload) => {
        if (cancelled) return
        if (payload?.success && typeof payload.data?.enabled === 'boolean') {
          setEnabled(payload.data.enabled)
        } else {
          setError(payload?.error || 'Failed to load setting')
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load setting')
      })
    return () => { cancelled = true }
  }, [])

  const toggle = async () => {
    if (enabled === null || pending) return
    setPending(true)
    setError(null)
    const next = !enabled
    try {
      const res = await fetch('/api/admin/feature-flags/ai-chatbot', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        body: JSON.stringify({ enabled: next }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok || !payload?.success) {
        setError(payload?.error || `Update failed (${res.status})`)
        return
      }
      setEnabled(next)
    } catch {
      setError('Update failed')
    } finally {
      setPending(false)
    }
  }

  const Icon = enabled ? Bot : BotOff
  const label = enabled === null
    ? 'AI chatbot'
    : enabled
      ? 'AI on'
      : 'AI off (admins only)'

  return (
    <button
      onClick={toggle}
      disabled={enabled === null || pending}
      title={error || (enabled
        ? 'AI chatbot is enabled for all users. Click to restrict to admins only.'
        : 'AI chatbot is restricted to admins. Click to enable for all users.')}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
        enabled === false
          ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
      }`}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {label}
    </button>
  )
}
