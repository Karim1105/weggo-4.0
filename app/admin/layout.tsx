import { ReactNode } from 'react'
import { requireAdminPageAccess } from '@/lib/admin-page-auth'

interface AdminLayoutProps {
	children: ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  await requireAdminPageAccess()

  return (
    <>
      <style>{`
        [data-global-navbar='true'] {
          display: none !important;
        }

        [data-ai-chatbot='true'] {
          display: none !important;
        }
      `}</style>
      {children}
    </>
  )
}
