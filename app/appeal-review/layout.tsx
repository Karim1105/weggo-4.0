import { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

interface AppealReviewLayoutProps {
  children: ReactNode
}

export default async function AppealReviewLayout({ children }: AppealReviewLayoutProps) {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  if (!token) {
    notFound()
  }

  const payload = verifyToken(token)
  if (!payload || payload.role !== 'admin') {
    notFound()
  }

  return <>{children}</>
}
