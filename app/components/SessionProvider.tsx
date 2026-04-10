'use client'

import { useEffect } from 'react'
import { SessionWarning } from '@/app/components/SessionWarning'
import { useSessionTimeout } from '@/lib/hooks/useSessionTimeout'

export function SessionProvider({ children }: { children: React.ReactNode }) {
  useSessionTimeout()

  // Store session start time saat provider mount
  useEffect(() => {
    const sessionStart = localStorage.getItem('session_start_time')
    if (!sessionStart) {
      localStorage.setItem('session_start_time', JSON.stringify(Date.now()))
    }
  }, [])

  return (
    <>
      <SessionWarning />
      {children}
    </>
  )
}
