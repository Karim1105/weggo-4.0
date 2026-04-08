import type { Metadata } from 'next'
import { Inter, Cairo } from 'next/font/google'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/db'
import User from '@/models/User'
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
    const token = cookieStore.get('token')?.value
    if (!token) return null

    const payload = verifyToken(token)
    if (!payload) return null

    await connectDB()
    const user = await User.findById(payload.userId).select('role').lean()
    if (!user) return null

    return (user as any).role === 'admin' ? 'admin' : 'user'
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

