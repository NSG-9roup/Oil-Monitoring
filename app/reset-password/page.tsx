'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import OilDropLoader from '@/app/components/OilDropLoader'
import Image from 'next/image'

const supabase = createClient()

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  
  const router = useRouter()

  useEffect(() => {
    // Check if the user is authenticated (Supabase sets session automatically when clicking reset link)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Sesi pemulihan tidak valid atau telah kedaluwarsa. Silakan ajukan reset kata sandi baru dari halaman login.')
      }
      setSessionChecked(true)
    }
    checkSession()
  }, [])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password.length < 6) {
      setError('Kata sandi harus minimal 6 karakter.')
      return
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error

      setSuccess(true)
      
      // Auto-redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login')
        router.refresh()
      }, 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui kata sandi. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-grid-pattern relative overflow-hidden px-4">
      {/* Animated background organic glowing blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-orange-400/10 to-red-500/10 filter blur-[120px] animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-red-500/10 to-amber-500/10 filter blur-[120px] animate-blob animation-delay-2000"></div>
      </div>

      <div className="bg-white/70 backdrop-blur-xl p-6 sm:p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.03)] w-full max-w-md relative z-10 border border-white/50 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-8">
          {/* Brand Logo Header */}
          <div className="flex justify-center items-center mb-6 select-none">
            <Image
              src="https://i.imgur.com/8nqsjFz.png"
              alt="Nabel Sakha Gemilang"
              width={160}
              height={48}
              className="h-9 sm:h-10 w-auto object-contain shrink-0"
              unoptimized
            />
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">
            Reset Kata Sandi
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            Masukkan kata sandi baru untuk akun Anda
          </p>
        </div>

        {!sessionChecked ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3">
            <OilDropLoader compact label="Memverifikasi sesi..." className="text-orange-500" />
          </div>
        ) : success ? (
          /* ================= SUCCESS STATE ================= */
          <div className="space-y-6 text-center animate-in fade-in duration-300">
            <div className="h-16 w-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-slate-800">Sandi Berhasil Diperbarui!</h2>
              <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                Kata sandi baru Anda telah aktif. Anda akan dialihkan secara otomatis ke halaman masuk dalam 3 detik...
              </p>
            </div>
            
            <button
              onClick={() => router.push('/login')}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-750 text-white font-black text-xs py-4 rounded-2xl transition-all shadow-md shadow-orange-500/10 flex items-center justify-center uppercase tracking-widest active:scale-[0.98]"
            >
              Masuk Sekarang
            </button>
          </div>
        ) : (
          /* ================= RESET FORM MODE ================= */
          <form onSubmit={handleResetPassword} className="space-y-5">
            {/* New Password Input */}
            <div>
              <label htmlFor="newPassword" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Kata Sandi Baru
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/50 rounded-2xl text-xs font-semibold text-slate-800 transition-all outline-none"
                  placeholder="Minimal 6 karakter"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-orange-500 transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  disabled={loading}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm New Password Input */}
            <div>
              <label htmlFor="confirmPassword" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Konfirmasi Kata Sandi Baru
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/50 rounded-2xl text-xs font-semibold text-slate-800 transition-all outline-none"
                  placeholder="Ulangi kata sandi baru"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-orange-500 transition-colors"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message rendering */}
            {error && (
              <div className="bg-red-50/50 border border-red-200/50 text-red-600 px-4 py-3 rounded-2xl text-xs font-bold flex items-start gap-2.5 animate-in fade-in duration-300">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-750 text-white font-black text-xs py-4 rounded-2xl transition-all shadow-md shadow-orange-500/10 hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center uppercase tracking-widest"
            >
              {loading ? (
                <OilDropLoader compact label="Memperbarui sandi..." className="text-white" />
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Perbarui Sandi
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => router.push('/login')}
              disabled={loading}
              className="w-full bg-slate-100 hover:bg-slate-200/70 text-slate-700 font-black text-xs py-4 rounded-2xl transition-all flex items-center justify-center uppercase tracking-widest active:scale-[0.98] disabled:opacity-50"
            >
              Kembali ke Login
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
