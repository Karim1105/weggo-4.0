import { AlertCircle, Inbox } from 'lucide-react'

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return <div className="rounded-xl border bg-white p-6 text-sm text-gray-500">{label}</div>
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="rounded-xl border bg-white px-6 py-12 text-center">
      <Inbox className="mx-auto h-7 w-7 text-gray-400" />
      <h3 className="mt-3 text-sm font-semibold text-gray-800">{title}</h3>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <span>{message}</span>
      </div>
    </div>
  )
}
