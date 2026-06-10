import { Metadata } from 'next'
import ProfileClient from '@/app/dashboard/profile/ProfileClient'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'My Profile | Oil Condition Monitoring',
  description: 'Manage your personal profile and preferences',
}

export default async function SalesProfilePage() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Fetch full profile data
  const { data: profile } = await supabase
    .from('oil_profiles')
    .select(`
      *,
      customer:customer_id (
        company_name,
        status
      )
    `)
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'sales') {
    redirect('/login')
  }

  const normalizedProfile = {
    ...profile,
    customer: Array.isArray(profile.customer)
      ? profile.customer[0] ?? null
      : profile.customer ?? null,
  }

  return (
    <div className="clean-ui min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 bg-grid-pattern py-8 px-4 sm:px-6 lg:px-8" style={{ backgroundSize: '40px 40px' }}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Profil Saya</h1>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Kelola informasi akun & kata sandi Anda</p>
          </div>
          <a
            href="/sales"
            className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-95"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali ke Dasbor
          </a>
        </div>
        <ProfileClient initialProfile={normalizedProfile} userEmail={user.email || ''} />
      </div>
    </div>
  )
}
