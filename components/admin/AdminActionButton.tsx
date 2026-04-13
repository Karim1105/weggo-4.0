'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminActionButtonProps {
  label: string
  onClick: () => void
  loading?: boolean
  disabled?: boolean
  variant?: 'default' | 'danger' | 'warning'
}

export default function AdminActionButton({
  label,
  onClick,
  loading = false,
  disabled = false,
  variant = 'default',
}: AdminActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'default' && 'bg-indigo-600 text-white hover:bg-indigo-500',
        variant === 'warning' && 'bg-amber-500 text-white hover:bg-amber-400',
        variant === 'danger' && 'bg-red-600 text-white hover:bg-red-500'
      )}
    >
      {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
      {label}
    </button>
  )
}
