import { Metadata } from 'next'
import ProfileClient from '@/app/dashboard/profile/ProfileClient'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Profil Saya | OilTrack Sales',
  description: 'Kelola informasi akun dan preferensi profil sales',
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
        id,
        company_name,
        logo_url,
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
    <div className="clean-ui min-h-screen bg-slate-50/60 bg-grid-pattern py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden" style={{ backgroundSize: '40px 40px' }}>
      {/* Organic Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-br from-orange-400/10 to-red-500/10 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-gradient-to-br from-amber-400/10 to-orange-500/10 blur-3xl"></div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-white/60 shadow-[0_10px_30px_rgba(0,0,0,0.03)]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OilTrack Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Profil Saya</h1>
            <p className="text-xs text-slate-500 font-semibold">Kelola informasi diri, nomor kontak, dan keamanan akun Sales Executive.</p>
          </div>
          
          <a
            href="/sales"
            className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 active:scale-95 shrink-0"
          >
            <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali ke Dasbor
          </a>
        </div>

        {/* Profile Content */}
        <ProfileClient initialProfile={normalizedProfile} userEmail={user.email || ''} />
      </div>
    </div>
  )
}
