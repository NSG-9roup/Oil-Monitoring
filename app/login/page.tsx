'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import OilDropLoader from '@/app/components/OilDropLoader'
import Image from 'next/image'

// Module-level Supabase client singleton to avoid instantiating on every render
const supabase = createClient()

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  
  // State to toggle between standard Login and Forgot Password recovery forms
  const [isForgotMode, setIsForgotMode] = useState(false)
  
  const router = useRouter()

  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : 'An error occurred during authentication'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        // Fetch role from profile table
        const { data: profile } = await supabase
          .from('oil_profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()

        const role = profile?.role
        
        // Save remember me preference to localStorage
        localStorage.setItem('oiltrack_remember_me', rememberMe ? 'true' : 'false')
        
        // Premium Client-Side Routing utilizing Next.js push and refresh
        // Keep loading = true during redirects to avoid transition flicker
        if (role === 'admin') {
          router.push('/admin')
          router.refresh()
        } else if (role === 'sales') {
          router.push('/sales')
          router.refresh()
        } else if (role === 'customer') {
          router.push('/dashboard')
          router.refresh()
        } else {
          router.push('/login')
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err))
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      setSuccessMsg('Tautan pemulihan kata sandi telah dikirim ke email Anda. Silakan periksa kotak masuk.')
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-grid-pattern relative overflow-hidden px-4">
      {/* Glassmorphic Loader Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white/75 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-6 max-w-sm text-center px-6">
            <OilDropLoader className="text-orange-500 scale-125" label="" />
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-800 tracking-tight animate-pulse">Menghubungkan ke Portal...</h3>
              <p className="text-xs text-slate-400 font-medium">Mohon tunggu sebentar, kami sedang menyiapkan dashboard Anda.</p>
            </div>
          </div>
        </div>
      )}

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
          <h1 className="flex justify-center items-center mb-2 select-none">
            <Image
              src="/teks logo.webp"
              alt="OilTrack"
              width={3186}
              height={881}
              className="h-14 w-auto object-contain shrink-0 filter drop-shadow-[0_4px_12px_rgba(234,88,12,0.15)]"
            />
          </h1>
          <p className="text-[11px] text-slate-500 font-black uppercase tracking-widest mt-2 select-none">
            Oil Condition Monitoring
          </p>
          <div className="flex items-center justify-center gap-1.5 mt-1.5 select-none">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Persembahan</span>
            <span className="w-1 h-1 bg-orange-500 rounded-full animate-pulse"></span>
            <span className="text-[9px] text-orange-600 font-extrabold uppercase tracking-wider">PT Nabel Sakha Gemilang</span>
          </div>
        </div>

        {!isForgotMode ? (
          /* ================= LOGIN MODE ================= */
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/50 rounded-2xl text-xs font-semibold text-slate-800 transition-all outline-none"
                  placeholder="your.email@company.com"
                  required
                />
              </div>
            </div>

            {/* Password Input with Visibility Toggle */}
            <div>
              <label htmlFor="password" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/50 rounded-2xl text-xs font-semibold text-slate-800 transition-all outline-none"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-orange-500 transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
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

            {/* Remember Me & Forgot Password Utilities */}
            <div className="flex items-center justify-between text-[11px] font-bold select-none">
              <label className="flex items-center gap-2 cursor-pointer text-slate-500 hover:text-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-orange-500 focus:ring-orange-400 border-slate-300 rounded transition-all cursor-pointer accent-orange-500"
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsForgotMode(true)
                  setError(null)
                  setSuccessMsg(null)
                }}
                className="text-orange-500 hover:text-orange-600 hover:underline transition-all"
              >
                Forgot Password?
              </button>
            </div>

            {/* Error Message rendering */}
            {error && (
              <div className="bg-red-50/50 border border-red-200/50 text-red-600 px-4 py-3 rounded-2xl text-xs font-bold flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
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
                <OilDropLoader compact label="Signing in..." className="text-white" />
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign In
                </>
              )}
            </button>
          </form>
        ) : (
          /* ================= FORGOT PASSWORD MODE ================= */
          <form onSubmit={handleForgotPassword} className="space-y-5 animate-in fade-in duration-300">
            <div>
              <p className="text-xs font-medium text-slate-500 leading-relaxed mb-4">
                Masukkan alamat email akun Anda. Kami akan mengirimkan tautan pemulihan untuk mengatur ulang kata sandi Anda.
              </p>
              
              <label htmlFor="recoveryEmail" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  id="recoveryEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/50 rounded-2xl text-xs font-semibold text-slate-800 transition-all outline-none"
                  placeholder="your.email@company.com"
                  required
                />
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

            {/* Success Message rendering */}
            {successMsg && (
              <div className="bg-emerald-50/60 border border-emerald-200/50 text-emerald-700 px-4 py-3 rounded-2xl text-xs font-bold flex items-start gap-2.5 animate-in fade-in duration-300">
                <svg className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{successMsg}</span>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading || !!successMsg}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-750 text-white font-black text-xs py-4 rounded-2xl transition-all shadow-md shadow-orange-500/10 hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center uppercase tracking-widest"
              >
                {loading ? (
                  <OilDropLoader compact label="Sending link..." className="text-white" />
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 00-2 2z" />
                    </svg>
                    Kirim Link Pemulihan
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsForgotMode(false)
                  setError(null)
                  setSuccessMsg(null)
                }}
                className="w-full bg-slate-100 hover:bg-slate-200/70 text-slate-700 font-black text-xs py-4 rounded-2xl transition-all flex items-center justify-center uppercase tracking-widest active:scale-[0.98]"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Kembali ke Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
