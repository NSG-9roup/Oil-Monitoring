import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Inactivity timeout dalam milidetik (default: 30 menit)
const INACTIVITY_TIMEOUT = 30 * 60 * 1000
// Warning sebelum logout dalam milidetik (5 menit sebelum logout)
const WARNING_TIME = 5 * 60 * 1000
// Session max age (24 jam)
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000

export function useSessionTimeout() {
  const router = useRouter()
  const supabase = createClient()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  // Fungsi untuk logout
  const logout = useCallback(async () => {
    // Hapus timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current)

    // Hapus session dari localStorage
    localStorage.removeItem('session_start_time')
    localStorage.removeItem('last_activity_time')

    // Logout dari Supabase
    await supabase.auth.signOut()

    // Redirect ke login
    router.replace('/login')
  }, [router, supabase])

  // Fungsi untuk reset timeout
  const resetTimeout = useCallback(() => {
    lastActivityRef.current = Date.now()

    // Hapus timeouts sebelumnya
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current)

    // Set warning timeout
    warningTimeoutRef.current = setTimeout(() => {
      // Emit event untuk warning
      const event = new Event('session_warning')
      window.dispatchEvent(event)
    }, INACTIVITY_TIMEOUT - WARNING_TIME)

    // Set logout timeout
    timeoutRef.current = setTimeout(() => {
      logout()
    }, INACTIVITY_TIMEOUT)

    // Simpan last activity di localStorage
    localStorage.setItem(
      'last_activity_time',
      JSON.stringify(Date.now())
    )
  }, [logout])

  // Monitor aktivitas user
  useEffect(() => {
    // Trigger untuk tracking aktivitas
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']

    const handleActivity = () => {
      resetTimeout()
    }

    // Handle browser/tab close
    const handleBeforeUnload = () => {
      localStorage.removeItem('session_start_time')
      localStorage.removeItem('last_activity_time')
    }

    // Tambahkan event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity)
    })
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Initial timeout setup
    resetTimeout()

    // Cleanup
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })
      window.removeEventListener('beforeunload', handleBeforeUnload)

      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current)
    }
  }, [resetTimeout])

  // Check session max age
  useEffect(() => {
    const checkSessionAge = setInterval(() => {
      const sessionStart = localStorage.getItem('session_start_time')
      if (sessionStart) {
        const age = Date.now() - parseInt(sessionStart, 10)
        if (age > SESSION_MAX_AGE) {
          logout()
        }
      }
    }, 60 * 1000) // Check setiap 1 menit

    return () => clearInterval(checkSessionAge)
  }, [logout])

  return { logout, lastActivityTime: lastActivityRef.current }
}
