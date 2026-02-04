import type { Metadata } from 'next'
import { Inter, Cairo } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import Navbar from '@/components/Navbar'
import AIChatbot from '@/components/AIChatbot'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const cairo = Cairo({ subsets: ['arabic', 'latin'], variable: '--font-cairo' })

export const metadata: Metadata = {
  title: 'Weggo - اشتري وبيع بسهولة',
  description: 'Your AI-powered marketplace for second-hand goods in Egypt',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" dir="ltr">
      <body className={`${inter.variable} ${cairo.variable} font-sans antialiased bg-gray-50`}>
        <ErrorBoundary>
          <Navbar />
          <main className="min-h-screen">
            {children}
          </main>
          <AIChatbot />
          <Toaster position="top-center" />
        </ErrorBoundary>
      </body>
    </html>
  )
}

