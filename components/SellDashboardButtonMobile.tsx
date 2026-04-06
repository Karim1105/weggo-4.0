import Link from 'next/link'
import { Plus, LayoutDashboard } from 'lucide-react'

interface SellDashboardButtonMobileProps {
  isAdmin: boolean
  isArabic: boolean
  onClick: () => void
}

export default function SellDashboardButtonMobile({ isAdmin, isArabic, onClick }: SellDashboardButtonMobileProps) {
  if (isAdmin) {
    return (
      <Link
        href="/admin"
        onClick={onClick}
        className="flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-full font-semibold"
      >
        <LayoutDashboard className="w-5 h-5" />
        <span>{isArabic ? 'لوحة التحكم' : 'Dashboard'}</span>
      </Link>
    )
  }

  return (
    <Link
      href="/sell"
      onClick={onClick}
      className="flex items-center justify-center space-x-2 gradient-primary text-white px-6 py-3 rounded-full font-semibold"
    >
      <Plus className="w-5 h-5" />
      <span>{isArabic ? 'بيع' : 'Sell'}</span>
    </Link>
  )
}
