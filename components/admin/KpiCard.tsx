import { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: number
  icon: LucideIcon
}

export function KpiCard({ title, value, icon: Icon }: KpiCardProps) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{title}</p>
        <Icon className="h-4 w-4 text-gray-400" />
      </div>
      <p className="mt-3 text-2xl font-semibold text-gray-900">{value.toLocaleString()}</p>
    </div>
  )
}
