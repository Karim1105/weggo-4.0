import type { Metadata } from 'next'
import { Inter, Cairo } from 'next/font/google'
import { cookies } from 'next/headers'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import Navbar from '@/components/Navbar'
import AIChatbot from '@/components/AIChatbot'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import MotionProvider from '@/components/MotionProvider'
import { initializeEnv } from '@/lib/env'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const cairo = Cairo({ subsets: ['arabic', 'latin'], variable: '--font-cairo' })

export const metadata: Metadata = {
  title: 'Weggo - اشتري وبيع بسهولة',
  description: 'Your AI-powered marketplace for second-hand goods in Egypt',
}

async function getUserRole(): Promise<'user' | 'admin' | null> {
  try {
    const cookieStore = await cookies()
    const cookieHeader = cookieStore.toString()
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'GET',
      headers: {
        Cookie: cookieHeader,
      },
    })

    const data = await res.json()
    if (data.success && data.user) {
      return data.user.role === 'admin' ? 'admin' : 'user'
    }
  } catch {
    // Not authenticated
  }

  return null
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  initializeEnv()
  const role = await getUserRole()

  return (
    <html lang="en" dir="ltr" className="overflow-x-hidden fast-motion">
      <body className={`${inter.variable} ${cairo.variable} font-sans antialiased bg-gray-50 overflow-x-hidden`}>
        <MotionProvider>
          <ErrorBoundary>
            <Navbar role={role} />
            <main className="min-h-screen overflow-x-hidden">
              {children}
            </main>
            <AIChatbot />
            <Toaster position="top-center" />
          </ErrorBoundary>
        </MotionProvider>
      </body>
    </html>
  )
}

