'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { z } from 'zod'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone_number: z.string().optional(),
})

export default function ProfileClient({ initialProfile, userEmail }: { initialProfile: Record<string, unknown> & { id?: string, full_name?: string, phone_number?: string, role?: string, customers?: { company_name?: string } }, userEmail: string }) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    full_name: initialProfile.full_name || '',
    phone_number: initialProfile.phone_number || '',
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const supabase = createClient()

  const handleSave = async () => {
    try {
      // Validate with Zod
      profileSchema.parse(formData)
      setErrors({})
      setIsSaving(true)

      const { error } = await supabase
        .from('profiles')
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
          <p className="text-gray-500">{initialProfile.customers?.company_name || 'System Admin'}</p>
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

          {initialProfile.customers && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Company</label>
              <input
                type="text"
                disabled
                value={initialProfile.customers.company_name}
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

          <button
            onClick={handlePasswordReset}
            className="w-full sm:w-auto px-6 py-2.5 text-orange-600 font-medium hover:bg-orange-50 rounded-lg transition-colors"
          >
            Reset Password
          </button>
        </div>
      </div>
    </div>
  )
}
