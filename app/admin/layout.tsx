import { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

interface AdminLayoutProps {
	children: ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
	// cookies() is async in this Next.js version, so we await it here
	const cookieStore = await cookies()
	const token = cookieStore.get('token')?.value

  if (!token) {
    // No auth token, treat as not found to avoid leaking admin path
    notFound()
  }

  const payload = verifyToken(token)

  if (!payload || payload.role !== 'admin') {
    // Authenticated but not an admin; hide the admin UI behind a 404
    notFound()
  }

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
