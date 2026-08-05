'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { z } from 'zod'
import { updateAnyUserProfile } from '@/app/actions/dashboardActions'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Nama harus minimal 2 karakter'),
  phone_number: z.string().optional(),
})

export default function ProfileClient({ initialProfile, userEmail }: { initialProfile: Record<string, unknown> & { id?: string, full_name?: string, phone_number?: string, role?: string, customer?: { company_name?: string } }, userEmail: string }) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    full_name: initialProfile.full_name || '',
    phone_number: initialProfile.phone_number || '',
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordData, setPasswordData] = useState({
    new_password: '',
    confirm_password: '',
  })
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const supabase = createClient()

  const handleSave = async () => {
    try {
      profileSchema.parse(formData)
      setErrors({})
      setIsSaving(true)

      const result = await updateAnyUserProfile({
        full_name: formData.full_name,
        phone_number: formData.phone_number,
      })

      if (!result.success) {
        throw new Error(result.error || 'Gagal memperbarui profil')
      }

      toast.success('Profil berhasil diperbarui')
      setIsEditing(false)
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        const fieldErrors: { [key: string]: string } = {}
        err.issues.forEach((e: z.ZodIssue) => {
          if (e.path[0]) fieldErrors[e.path[0].toString()] = e.message
        })
        setErrors(fieldErrors)
        toast.error('Silakan periksa kembali form pengisian')
      } else {
        console.error(err)
        toast.error((err as Error).message || 'Gagal memperbarui profil')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDirectPasswordChange = async () => {
    if (passwordData.new_password.length < 6) {
      toast.error('Kata sandi minimal 6 karakter')
      return
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Konfirmasi kata sandi tidak cocok')
      return
    }

    try {
      setIsUpdatingPassword(true)
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new_password
      })

      if (error) throw error

      toast.success('Kata sandi berhasil diperbarui')
      setPasswordData({ new_password: '', confirm_password: '' })
      setShowPasswordForm(false)
    } catch (err: unknown) {
      console.error(err)
      toast.error((err as Error).message || 'Gagal memperbarui kata sandi')
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const initialLetter = (formData.full_name?.charAt(0) || userEmail?.charAt(0) || '?').toUpperCase()
  const roleDisplay = initialProfile.role === 'sales' 
    ? 'Sales Representative' 
    : initialProfile.role === 'admin' 
    ? 'System Administrator' 
    : 'Customer Client'

  return (
    <div className="space-y-6 animate-pop-micro">
      {/* Profile Card Header Banner */}
      <div className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden relative">
        <div className="h-28 bg-gradient-to-r from-slate-900 via-slate-800 to-orange-950 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-48 h-48 bg-orange-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute right-1/3 -bottom-10 w-36 h-36 bg-red-500/10 rounded-full blur-xl pointer-events-none"></div>
        </div>

        <div className="px-6 sm:px-8 pb-6 pt-0 relative flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12">
          <div className="flex items-end gap-5">
            <div className="h-24 w-24 rounded-2xl bg-gradient-to-tr from-orange-500 to-red-600 p-1 shadow-lg shadow-orange-500/20 shrink-0">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-white text-3xl font-black uppercase tracking-wider">
                {initialLetter}
              </div>
            </div>
            <div className="space-y-1 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {formData.full_name || 'Pengguna OilTrack'}
                </h2>
                <span className="px-3 py-1 bg-orange-500/10 text-orange-600 border border-orange-500/20 text-[10px] font-black uppercase tracking-widest rounded-full">
                  {initialProfile.role || 'User'}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500">
                {initialProfile.customer?.company_name || roleDisplay}
              </p>
            </div>
          </div>

          <div className="pb-1">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-slate-900/10 active:scale-95 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 210.3H3v-3.572L16.732 3.732z" />
                </svg>
                Edit Informasi Profil
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setFormData({
                      full_name: initialProfile.full_name || '',
                      phone_number: initialProfile.phone_number || '',
                    })
                    setErrors({})
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-orange-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Profile Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Account Details & Status */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-slate-100 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Detail Ringkasan
            </h3>

            <div className="space-y-3.5 divide-y divide-slate-100">
              <div className="pt-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Role Akses</span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block capitalize">{initialProfile.role || 'sales'}</span>
              </div>

              <div className="pt-3">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Status Akun</span>
                <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full text-[10px] font-black uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  Aktif & Terverifikasi
                </span>
              </div>

              {initialProfile.customer && (
                <div className="pt-3">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Perusahaan Terdaftar</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block">{initialProfile.customer.company_name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Push Notification Box */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-slate-100 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Notifikasi Perangkat
            </h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Terima notifikasi instan saat penawaran atau permintaan sampel di-update.
            </p>
            <div className="space-y-2 pt-1">
              <button
                onClick={async () => {
                  if (!('Notification' in window)) {
                    toast.error('Browser Anda tidak mendukung notifikasi push.')
                    return
                  }
                  const permission = await Notification.requestPermission()
                  if (permission === 'granted') {
                    toast.success('Notifikasi push berhasil diaktifkan!')
                    try {
                      const reg = await navigator.serviceWorker.ready
                      const sub = await reg.pushManager.subscribe({
                        userVisibleOnly: true,
                      }).catch(() => null)
                      
                      if (sub) {
                        await fetch('/api/push/subscribe', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ subscription: sub })
                        })
                      }
                    } catch (e) {
                      console.log('Push subscribe backend error:', e)
                    }
                  } else {
                    toast.error('Izin notifikasi ditolak oleh pengguna.')
                  }
                }}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl uppercase tracking-wider transition-all shadow-sm active:scale-98 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Aktifkan Notifikasi
              </button>
              
              <button
                onClick={async () => {
                  if (!('Notification' in window) || Notification.permission !== 'granted') {
                    toast.error('Harap aktifkan izin notifikasi terlebih dahulu.')
                    return
                  }
                  try {
                    const reg = await navigator.serviceWorker.ready
                    reg.showNotification('OilTrack System', {
                      body: 'Notifikasi simulasi: Permintaan penawaran telah disetujui.',
                      icon: 'https://i.imgur.com/8nqsjFz.png',
                      badge: 'https://i.imgur.com/8nqsjFz.png',
                      data: '/sales',
                    } as unknown as NotificationOptions)
                    toast.success('Notifikasi simulasi berhasil terdaftar!')
                  } catch {
                    new Notification('OilTrack System', {
                      body: 'Notifikasi simulasi: Permintaan penawaran telah disetujui.',
                      icon: 'https://i.imgur.com/8nqsjFz.png',
                    })
                    toast.success('Notifikasi simulasi dikirim (fallback)!')
                  }
                }}
                className="w-full py-2.5 border border-slate-200 text-slate-600 font-extrabold text-xs rounded-xl hover:bg-slate-50 transition-colors uppercase tracking-wider flex items-center justify-center gap-2"
              >
                Simulasi Tes Notifikasi
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Profile Fields & Password Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Information Form */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-slate-100 space-y-5">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Informasi Pribadi & Kontak
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className={`w-full px-4 py-3 bg-slate-50/50 focus:bg-white border rounded-2xl text-xs font-bold text-slate-800 transition-all outline-none disabled:bg-slate-100/60 disabled:text-slate-500 ${
                    errors.full_name ? 'border-red-400 focus:ring-4 focus:ring-red-100' : 'border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/50'
                  }`}
                  placeholder="Nama Lengkap Anda"
                />
                {errors.full_name && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.full_name}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  Alamat Email (Pengenal Utama)
                </label>
                <input
                  type="email"
                  disabled
                  value={userEmail}
                  className="w-full px-4 py-3 bg-slate-100/80 border border-slate-200/80 rounded-2xl text-xs font-bold text-slate-500 cursor-not-allowed"
                />
                <p className="text-[10px] text-slate-400 font-semibold mt-1">Email akun ditautkan dari sistem otentikasi utama dan tidak dapat diubah di sini.</p>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
                  Nomor Telepon / WhatsApp
                </label>
                <input
                  type="tel"
                  disabled={!isEditing}
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/50 rounded-2xl text-xs font-bold text-slate-800 transition-all outline-none disabled:bg-slate-100/60 disabled:text-slate-500"
                  placeholder="+62 812 3456 7890"
                />
              </div>
            </div>
          </div>

          {/* Security & Password Card */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-slate-100 space-y-5">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Keamanan Akun & Kata Sandi
            </h3>

            {!showPasswordForm ? (
              <div className="flex items-center justify-between p-4 bg-orange-50/50 border border-orange-100 rounded-2xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Kata Sandi Akun</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Perbarui kata sandi Anda secara berkala untuk menjaga keamanan akun.</p>
                </div>
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="px-4 py-2 bg-white hover:bg-orange-50 border border-orange-200 text-orange-600 font-black text-xs rounded-xl uppercase tracking-wider transition-all shadow-sm active:scale-95 shrink-0"
                >
                  Ubah Kata Sandi
                </button>
              </div>
            ) : (
              <div className="bg-slate-50/70 p-5 border border-slate-200/80 rounded-2xl space-y-4 animate-pop-micro">
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                      Kata Sandi Baru
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={passwordData.new_password}
                        onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                        placeholder="Minimal 6 karakter"
                        className="w-full px-4 py-3 pr-10 bg-white border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/50 rounded-xl text-xs font-bold text-slate-800 transition-all outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-orange-500 transition-colors"
                      >
                        {showNewPassword ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                      Konfirmasi Kata Sandi Baru
                    </label>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                      placeholder="Masukkan ulang kata sandi"
                      className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-100/50 rounded-xl text-xs font-bold text-slate-800 transition-all outline-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        setShowPasswordForm(false)
                        setPasswordData({ new_password: '', confirm_password: '' })
                      }}
                      className="px-4 py-2.5 bg-slate-200/80 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs uppercase tracking-wider transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleDirectPasswordChange}
                      disabled={isUpdatingPassword}
                      className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white font-black rounded-xl text-xs uppercase tracking-wider hover:from-orange-600 hover:to-red-700 transition-all shadow-md shadow-orange-500/20 active:scale-95 disabled:opacity-50"
                    >
                      {isUpdatingPassword ? 'Memproses...' : 'Simpan Kata Sandi'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
