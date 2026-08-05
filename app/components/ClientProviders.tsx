'use client'

import { Suspense, useEffect } from 'react'
import { ErrorBoundary } from '@/app/components/ErrorBoundary'
import { SessionProvider } from '@/app/components/SessionProvider'

export function ClientProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => console.log('[PWA] Service Worker registered with scope: ', reg.scope))
          .catch((err) => console.error('[PWA] Service Worker registration failed: ', err))
      })
    }
  }, [])

  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <SessionProvider>{children}</SessionProvider>
      </Suspense>
    </ErrorBoundary>
  )
}
