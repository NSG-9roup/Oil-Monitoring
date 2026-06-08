import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ClientProviders } from '@/app/components/ClientProviders'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Oil Condition Monitoring',
  description: 'Industrial oil condition monitoring system',
  manifest: '/manifest.json',
  icons: {
    icon: '/nav logo.webp',
    shortcut: '/nav logo.webp',
    apple: '/nav logo.webp',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

import { cookies } from 'next/headers'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const lang = cookieStore.get('language')?.value || 'en'

  return (
    <html lang={lang} suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ClientProviders>
          {children}
        </ClientProviders>
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
