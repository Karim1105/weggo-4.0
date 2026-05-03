import { ReactNode } from 'react'
import { requireAdminPageAccess } from '@/lib/admin-page-auth'

export default async function ReportReviewLayout({ children }: { children: ReactNode }) {
  await requireAdminPageAccess()
  return children
}
