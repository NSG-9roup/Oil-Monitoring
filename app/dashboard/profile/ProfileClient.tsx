'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { z } from 'zod'
import imageCompression from 'browser-image-compression'
import { updateAnyUserProfile, updateUserAvatarAction, uploadUserAvatarServerAction } from '@/app/actions/dashboardActions'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Nama harus minimal 2 karakter'),
  phone_number: z.string().optional(),
})

interface ProfileStats {
  machinesCount: number
  labTestsCount: number
  labRequestsCount: number
  ordersCount: number
}

interface TeamMember {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
  phone_number: string | null
  created_at: string | null
}

interface ProfileClientProps {
  initialProfile: Record<string, unknown> & {
    id?: string
    full_name?: string
    phone_number?: string
    role?: string
    avatar_url?: string | null
    customer?: { company_name?: string; status?: string; logo_url?: string | null }
  }
  userEmail: string
  stats?: ProfileStats
  teamMembers?: TeamMember[]
}

export default function ProfileClient({
  initialProfile,
  userEmail,
  stats = { machinesCount: 0, labTestsCount: 0, labRequestsCount: 0, ordersCount: 0 },
  teamMembers = []
}: ProfileClientProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    (initialProfile.avatar_url as string) || null
  )
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
  const [notifPermission, setNotifPermission] = useState<string>('default')
  
  const supabase = createClient()

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission)
    }
  }, [])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa format gambar (JPG, PNG, WebP).')
      return
    }

    try {
      setIsUploadingAvatar(true)
      const toastId = toast.loading('Mengompres dan mengunggah foto profil...')

      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
        fileType: 'image/webp',
      })

      const formData = new FormData()
      formData.append('avatar', compressedFile, `${initialProfile.id || 'user'}.webp`)

      const res = await uploadUserAvatarServerAction(formData)
      toast.dismiss(toastId)

      if (res.success && res.publicUrl) {
        setAvatarUrl(res.publicUrl)
        toast.success('Foto profil berhasil diperbarui!')
      } else {
        toast.error(res.error || 'Gagal menyimpan foto profil.')
      }
    } catch (err) {
      console.error('Error uploading avatar:', err)
      toast.error(err instanceof Error ? err.message : 'Gagal mengunggah foto profil.')
    } finally {
      setIsUploadingAvatar(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveAvatar = async () => {
    try {
      setIsUploadingAvatar(true)
      const res = await updateUserAvatarAction(null)
      if (res.success) {
        setAvatarUrl(null)
        toast.success(
          initialProfile.role === 'customer' && initialProfile.customer?.logo_url
            ? 'Foto profil dihapus. Otomatis menggunakan logo perusahaan.'
            : 'Foto profil berhasil dihapus.'
        )
      } else {
        toast.error(res.error || 'Gagal menghapus foto profil.')
      }
    } catch (err) {
      console.error('Error removing avatar:', err)
      toast.error('Gagal menghapus foto profil.')
    } finally {
      setIsUploadingAvatar(false)
    }
  }

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

      toast.success('Profil berhasil diperbarui!')
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

      toast.success('Kata sandi berhasil diperbarui!')
      setPasswordData({ new_password: '', confirm_password: '' })
      setShowPasswordForm(false)
    } catch (err: unknown) {
      console.error(err)
      toast.error((err as Error).message || 'Gagal memperbarui kata sandi')
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const handleEnablePushNotification = async () => {
    if (!('Notification' in window)) {
      toast.error('Browser Anda tidak mendukung notifikasi push.')
      return
    }
    const permission = await Notification.requestPermission()
    setNotifPermission(permission)
    
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
  }

  const initialLetter = (formData.full_name?.charAt(0) || userEmail?.charAt(0) || '?').toUpperCase()
  const roleDisplay = initialProfile.role === 'sales' 
    ? 'Sales Representative' 
    : initialProfile.role === 'admin' 
    ? 'System Administrator' 
    : 'Customer Client'

  const displayAvatar = avatarUrl || (initialProfile.role === 'customer' ? initialProfile.customer?.logo_url : null)
  const isUsingCompanyLogo = !avatarUrl && initialProfile.role === 'customer' && !!initialProfile.customer?.logo_url

  return (
    <div className="space-y-6 animate-pop-micro">
      {/* Profile Card Banner */}
      <div className="bg-white rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden relative">
        {/* Cover Banner */}
        <div className="h-44 sm:h-48 bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" style={{ backgroundSize: '24px 24px' }}></div>
          <div className="absolute -right-10 -top-10 w-64 h-64 bg-orange-500/25 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute right-1/3 -bottom-10 w-48 h-48 bg-red-500/20 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute left-10 top-1/2 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl pointer-events-none"></div>
        </div>

        {/* Profile Card Content Details */}
        <div className="px-6 sm:px-8 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
            {/* Left: Avatar & Info */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
              {/* Avatar Box with overlapping offset */}
              <div className="relative -mt-16 sm:-mt-20 shrink-0 w-28 h-28 sm:w-32 sm:h-32 group">
                <div className="w-full h-full rounded-3xl bg-white border-4 border-white shadow-2xl shadow-slate-950/20 p-0.5 overflow-hidden flex items-center justify-center relative">
                  {displayAvatar ? (
                    <div className="w-full h-full bg-slate-50 rounded-[20px] flex items-center justify-center p-1 overflow-hidden relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={displayAvatar}
                        alt={formData.full_name || 'Profile Avatar'}
                        className={`w-full h-full ${isUsingCompanyLogo ? 'object-contain p-2' : 'object-cover'}`}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-950 rounded-[20px] flex items-center justify-center text-white text-4xl sm:text-5xl font-black uppercase tracking-wider shadow-inner">
                      {initialLetter}
                    </div>
                  )}

                  {/* Uploading Spinner Overlay */}
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-slate-900/75 backdrop-blur-xs rounded-3xl flex flex-col items-center justify-center text-white text-[10px] font-black z-30">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white mb-1" />
                      <span>Upload...</span>
                    </div>
                  )}
                </div>

                {/* Camera Button to Change Avatar */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute bottom-0 right-0 p-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl shadow-lg shadow-orange-500/30 transition-all transform hover:scale-110 active:scale-95 border-2 border-white flex items-center justify-center z-20"
                  title="Ganti Foto Profil"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              {/* User Name, Role & Details (Completely on white surface below cover line) */}
              <div className="space-y-1.5 pt-2 sm:pt-0 pb-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                    {formData.full_name || 'Pengguna OilTrack'}
                  </h2>
                  <span className="px-3 py-1 bg-orange-500/10 text-orange-600 border border-orange-500/20 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm">
                    {initialProfile.role || 'User'}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <p className="font-bold text-slate-500">
                    {initialProfile.customer?.company_name || roleDisplay}
                  </p>

                  {/* Indication tag if using corporate logo fallback */}
                  {isUsingCompanyLogo && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-md">
                      <span>🏢 Logo Perusahaan</span>
                    </span>
                  )}

                  {/* Remove custom avatar button if custom avatar is uploaded */}
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingAvatar}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-700 hover:underline transition-all flex items-center gap-1 ml-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Hapus Foto
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Edit Profile Button */}
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


        {/* Corporate Asset Statistics Summary Bar */}
        {initialProfile.role === 'customer' && (
          <div className="px-6 sm:px-8 py-4 bg-slate-50/80 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-100/80 text-orange-600 border border-orange-200/60 flex items-center justify-center shrink-0 shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Mesin Terdaftar</span>
                <span className="text-sm font-black text-slate-900">{stats.machinesCount} Mesin</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-100/80 text-blue-600 border border-blue-200/60 flex items-center justify-center shrink-0 shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Pengujian Lab</span>
                <span className="text-sm font-black text-slate-900">{stats.labTestsCount} Laporan</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100/80 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0 shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Request Lab</span>
                <span className="text-sm font-black text-slate-900">{stats.labRequestsCount} Permintaan</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100/80 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0 shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Penawaran Oli</span>
                <span className="text-sm font-black text-slate-900">{stats.ordersCount} Penawaran</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Summary & Push Notification Status */}
        <div className="lg:col-span-1 space-y-6">
          {/* Account Overview Box */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-slate-100 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Detail Ringkasan
            </h3>

            <div className="space-y-3.5 divide-y divide-slate-100">
              <div className="pt-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Role Akses Sistem</span>
                <span className="text-xs font-bold text-slate-800 mt-0.5 block capitalize">{roleDisplay}</span>
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

          {/* Push Notification Device Manager */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Notifikasi Perangkat
              </h3>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                notifPermission === 'granted'
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : notifPermission === 'denied'
                  ? 'bg-red-50 text-red-600 border-red-200'
                  : 'bg-amber-50 text-amber-600 border-amber-200'
              }`}>
                {notifPermission === 'granted' ? 'Aktif' : notifPermission === 'denied' ? 'Dibatasi' : 'Belum Izin'}
              </span>
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Dapatkan notifikasi instan secara otomatis saat hasil uji lab terbit atau penawaran produk disetujui.
            </p>

            <div className="space-y-2 pt-1">
              <button
                onClick={handleEnablePushNotification}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl uppercase tracking-wider transition-all shadow-sm active:scale-98 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {notifPermission === 'granted' ? 'Perbarui Izin Notifikasi' : 'Aktifkan Notifikasi Push'}
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
                      body: 'Notifikasi simulasi: Laporan hasil uji lab terbaru siap diunduh.',
                      icon: 'https://i.imgur.com/8nqsjFz.png',
                      badge: 'https://i.imgur.com/8nqsjFz.png',
                      data: '/dashboard',
                    } as unknown as NotificationOptions)
                    toast.success('Notifikasi simulasi berhasil dikirim!')
                  } catch {
                    new Notification('OilTrack System', {
                      body: 'Notifikasi simulasi: Laporan hasil uji lab terbaru siap diunduh.',
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

        {/* Right Column: Profile Form, Team Roster, Security */}
        <div className="lg:col-span-2 space-y-6">
          {/* Editable Personal Info Form */}
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
                <p className="text-[10px] text-slate-400 font-semibold mt-1">Email akun ditautkan dari sistem otentikasi utama dan tidak dapat diubah secara langsung.</p>
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

          {/* Company Team Members Roster */}
          {initialProfile.role === 'customer' && teamMembers.length > 0 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Anggota Tim Perusahaan ({teamMembers.length})
                </h3>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  {initialProfile.customer?.company_name || 'Customer Team'}
                </span>
              </div>

              <div className="space-y-3 pt-1">
                {teamMembers.map((member) => {
                  const isCurrent = member.id === initialProfile.id
                  const memberLetter = (member.full_name?.charAt(0) || member.email?.charAt(0) || '?').toUpperCase()

                  return (
                    <div
                      key={member.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all ${
                        isCurrent
                          ? 'bg-orange-50/50 border-orange-200/80 shadow-sm'
                          : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs uppercase ${
                          isCurrent
                            ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20'
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {memberLetter}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-slate-900">
                              {member.full_name || 'Pengguna'}
                            </h4>
                            {isCurrent && (
                              <span className="px-2 py-0.2 bg-orange-100 text-orange-700 text-[9px] font-black uppercase rounded-full">
                                Saya
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {member.email} {member.phone_number ? `• ${member.phone_number}` : ''}
                          </p>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-lg capitalize">
                        {member.role || 'Staff'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Account Security Card */}
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
