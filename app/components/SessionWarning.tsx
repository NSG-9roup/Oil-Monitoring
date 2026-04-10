'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function SessionWarning() {
  const [showWarning, setShowWarning] = useState(false)
  const [countdownSeconds, setCountdownSeconds] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const handleSessionWarning = () => {
      setShowWarning(true)
      setCountdownSeconds(300) // 5 menit = 300 detik
    }

    window.addEventListener('session_warning', handleSessionWarning)

    return () => {
      window.removeEventListener('session_warning', handleSessionWarning)
    }
  }, [])

  useEffect(() => {
    if (!showWarning) return

    const interval = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          setShowWarning(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [showWarning])

  const handleStayLoggedIn = () => {
    setShowWarning(false)
    // Reset timeout dengan trigger activity
    window.dispatchEvent(new Event('mousedown'))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (!showWarning) return null

  const minutes = Math.floor(countdownSeconds / 60)
  const seconds = countdownSeconds % 60

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            ⚠️ Sesi Anda Akan Terputus
          </h2>
          <p className="text-gray-600">
            Anda tidak melakukan aktivitas selama 25 menit. Sesi akan ditutup dalam{' '}
            <span className="font-bold text-primary-600">
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
            {' '}menit.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleStayLoggedIn}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition"
          >
            Tetap Login
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
