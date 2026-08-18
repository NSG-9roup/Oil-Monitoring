import { Metadata } from 'next'
import ProfileClient from './ProfileClient'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Profil Saya & Tim | Oil Condition Monitoring',
  description: 'Kelola informasi akun, tim perusahaan, preferensi, dan keamanan',
}

export default async function ProfilePage() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Fetch full profile data with corporate customer details
  const { data: profile } = await supabase
    .from('oil_profiles')
    .select(`
      *,
      customer:customer_id (
        id,
        company_name,
        logo_url,
        status,
        created_at
      )
    `)
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  const normalizedProfile = {
    ...profile,
    customer: Array.isArray(profile.customer)
      ? profile.customer[0] ?? null
      : profile.customer ?? null,
  }

  // Fetch stats and team members parallelly if customer_id exists
  let stats = {
    machinesCount: 0,
    labTestsCount: 0,
    labRequestsCount: 0,
    ordersCount: 0,
  }

  let teamMembers: Array<{
    id: string
    full_name: string | null
    email: string | null
    role: string | null
    phone_number: string | null
    created_at: string | null
  }> = []

  const customerId = normalizedProfile.customer_id

  if (customerId) {
    const serviceDb = createServiceClient()
    const [
      { count: machinesCount },
      { count: labTestsCount },
      { count: labRequestsCount },
      { count: ordersCount },
      { data: teamData }
    ] = await Promise.all([
      serviceDb.from('oil_machines').select('*', { count: 'exact', head: true }).eq('customer_id', customerId),
      serviceDb.from('oil_lab_tests').select('id, oil_machines!inner(customer_id)', { count: 'exact', head: true }).eq('oil_machines.customer_id', customerId),
      serviceDb.from('oil_lab_requests').select('*', { count: 'exact', head: true }).eq('customer_id', customerId),
      serviceDb.from('oil_orders').select('*', { count: 'exact', head: true }).eq('customer_id', customerId),
      serviceDb.from('oil_profiles').select('id, full_name, email, role, phone_number, created_at').eq('customer_id', customerId).order('created_at', { ascending: true })
    ])

    stats = {
      machinesCount: machinesCount || 0,
      labTestsCount: labTestsCount || 0,
      labRequestsCount: labRequestsCount || 0,
      ordersCount: ordersCount || 0,
    }

    if (teamData) {
      teamMembers = teamData
    }
  }

  return (
    <div className="clean-ui min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-orange-50/30 bg-grid-pattern py-8 px-4 sm:px-6 lg:px-8" style={{ backgroundSize: '40px 40px' }}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Top Header Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-white/60 shadow-[0_10px_30px_rgba(0,0,0,0.03)]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OilTrack Account Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Profil & Informasi Tim</h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">Kelola informasi akun pribadi, ringkasan tim perusahaan, dan notifikasi keamanan.</p>
          </div>
          <a
            href={normalizedProfile.role === 'sales' ? '/sales' : normalizedProfile.role === 'admin' ? '/admin' : '/dashboard'}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 active:scale-95 shrink-0"
          >
            <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali ke Dasbor
          </a>
        </div>

        {/* Client Profile Component */}
        <ProfileClient
          initialProfile={normalizedProfile}
          userEmail={user.email || ''}
          stats={stats}
          teamMembers={teamMembers}
        />
      </div>
    </div>
  )
}
