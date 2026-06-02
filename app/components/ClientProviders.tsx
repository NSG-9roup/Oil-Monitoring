'use client'

import { Suspense } from 'react'
import { ErrorBoundary } from '@/app/components/ErrorBoundary'
import { SessionProvider } from '@/app/components/SessionProvider'

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <SessionProvider>{children}</SessionProvider>
      </Suspense>
    </ErrorBoundary>
  )
}
