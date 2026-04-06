import Link from 'next/link'
import { Plus, LayoutDashboard } from 'lucide-react'

interface SellDashboardButtonProps {
  isAdmin: boolean
  isArabic: boolean
}

export default function SellDashboardButton({ isAdmin, isArabic }: SellDashboardButtonProps) {
  if (isAdmin) {
    return (
      <Link
        href="/admin"
        className="group flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-2xl font-bold hover:shadow-xl transition-all hover:-translate-y-1 shadow-lg"
      >
        <LayoutDashboard className="w-5 h-5 group-hover:scale-110 transition-transform" />
        <span>{isArabic ? 'لوحة التحكم' : 'Dashboard'}</span>
      </Link>
    )
  }

  return (
    <Link
      href="/sell"
      className="group flex items-center space-x-2 gradient-primary text-white px-6 py-3 rounded-2xl font-bold hover:shadow-xl transition-all hover:-translate-y-1 shadow-lg"
    >
      <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
      <span>{isArabic ? 'بيع' : 'Sell'}</span>
    </Link>
  )
}
