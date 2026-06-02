'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { z } from 'zod'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
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
      // Validate with Zod
      profileSchema.parse(formData)
      setErrors({})
      setIsSaving(true)

      const { error } = await supabase
        .from('oil_profiles')
        .update({
          full_name: formData.full_name,
          phone_number: formData.phone_number,
        })
        .eq('id', initialProfile.id)

      if (error) throw error

      toast.success('Profile updated successfully')
      setIsEditing(false)
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        const fieldErrors: { [key: string]: string } = {}
        err.issues.forEach((e: z.ZodIssue) => {
          if (e.path[0]) fieldErrors[e.path[0].toString()] = e.message
        })
        setErrors(fieldErrors)
        toast.error('Please check the form for errors')
      } else {
        console.error(err)
        toast.error((err as Error).message || 'Failed to update profile')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDirectPasswordChange = async () => {
    if (passwordData.new_password.length < 6) {
      toast.error(initialProfile.role === 'customer' || true ? 'Kata sandi minimal 6 karakter' : 'Password must be at least 6 characters')
      return
    }
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error(initialProfile.role === 'customer' || true ? 'Konfirmasi kata sandi tidak cocok' : 'Passwords do not match')
      return
    }

    try {
      setIsUpdatingPassword(true)
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new_password
      })

      if (error) throw error

      toast.success(initialProfile.role === 'customer' || true ? 'Kata sandi berhasil diperbarui' : 'Password changed successfully')
      setPasswordData({ new_password: '', confirm_password: '' })
      setShowPasswordForm(false)
    } catch (err: unknown) {
      console.error(err)
      toast.error((err as Error).message || 'Gagal memperbarui kata sandi')
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const handlePasswordReset = async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/dashboard/profile/update-password`,
      })
      if (error) throw error
      toast.success('Password reset link sent to your email')
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to send reset link')
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header Info */}
      <div className="p-6 sm:p-8 bg-gray-50 border-b border-gray-200 flex items-center gap-6">
        <div className="h-20 w-20 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-3xl font-bold uppercase shadow-sm">
          {formData.full_name?.charAt(0) || userEmail?.charAt(0) || '?'}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{initialProfile.full_name}</h2>
          <p className="text-gray-500">{initialProfile.customer?.company_name || 'System Admin'}</p>
          <span className="inline-block mt-2 px-3 py-1 bg-orange-100 text-orange-800 text-xs font-semibold rounded-full capitalize">
            {initialProfile.role}
          </span>
        </div>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Full Name</label>
            <input
              type="text"
              disabled={!isEditing}
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className={`w-full p-2.5 rounded-lg border focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors disabled:bg-gray-100 disabled:text-gray-500 ${
                errors.full_name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
              }`}
            />
            {errors.full_name && <p className="text-red-500 text-xs">{errors.full_name}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Email Address</label>
            <input
              type="email"
              disabled
              value={userEmail}
              className="w-full p-2.5 rounded-lg border border-gray-300 bg-gray-100 text-gray-500"
              title="Email cannot be changed here"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Phone Number</label>
            <input
              type="tel"
              disabled={!isEditing}
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              className="w-full p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors disabled:bg-gray-100 disabled:text-gray-500"
              placeholder="+62 8..."
            />
          </div>

          {initialProfile.customer && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Company</label>
              <input
                type="text"
                disabled
                value={initialProfile.customer.company_name}
                className="w-full p-2.5 rounded-lg border border-gray-300 bg-gray-100 text-gray-500"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="w-full sm:w-auto">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full sm:w-auto px-6 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                Edit Profile
              </button>
            ) : (
              <div className="flex gap-3 w-full sm:w-auto">
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setFormData({
                      full_name: initialProfile.full_name || '',
                      phone_number: initialProfile.phone_number || '',
                    })
                    setErrors({})
                  }}
                  className="flex-1 sm:flex-none px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>

        {/* Change Password Section */}
        <div className="pt-6 border-t border-gray-200">
          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="w-full sm:w-auto px-6 py-2.5 text-orange-650 font-bold hover:bg-orange-50 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Ubah Kata Sandi
            </button>
          ) : (
            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 space-y-4 max-w-md animate-in fade-in slide-in-from-top-3 duration-300">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Ubah Kata Sandi Baru
              </h3>
              
              <div className="space-y-3">
                <div className="space-y-1 relative">
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Kata Sandi Baru</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      placeholder="Minimal 6 karakter"
                      className="w-full p-2.5 pr-10 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-650 transition-colors"
                    >
                      {showNewPassword ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Konfirmasi Kata Sandi</label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                    placeholder="Masukkan ulang kata sandi"
                    className="w-full p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-xs font-bold"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={() => {
                      setShowPasswordForm(false)
                      setPasswordData({ new_password: '', confirm_password: '' })
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 font-bold rounded-xl text-[11px] uppercase tracking-wider hover:bg-gray-100 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleDirectPasswordChange}
                    disabled={isUpdatingPassword}
                    className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold rounded-xl text-[11px] uppercase tracking-wider hover:from-orange-600 hover:to-red-700 transition-all shadow-md shadow-orange-500/10 active:scale-95 disabled:opacity-50"
                  >
                    {isUpdatingPassword ? 'Memproses...' : 'Ubah Sandi'}
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
