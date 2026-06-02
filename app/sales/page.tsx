import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SalesClient from './SalesClient'
import type { LabRequest } from '@/lib/types'

export default async function SalesPage() {
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()
  
  const user = session?.user

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('oil_profiles')
    .select(`
      *,
      customer:customer_id (
        id,
        company_name,
        status
      )
    `)
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  if (profile.role === 'admin') redirect('/admin')
  if (profile.role === 'customer') redirect('/dashboard')

  if (profile.role !== 'sales') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600">You do not have sales access.</p>
        </div>
      </div>
    )
  }

  // Fetch lab requests that are pending or assigned (not completed/cancelled)
  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: labRequests } = await adminSupabase
    .from('oil_lab_requests')
    .select(`
      *,
      machine:oil_machines(machine_name, location, serial_number, model),
      customer:oil_customers(company_name, logo_url),
      requested_by:oil_profiles!oil_lab_requests_requested_by_profile_id_fkey(full_name, email)
    `)
    .in('status', ['pending', 'assigned', 'sampling'])
    .order('created_at', { ascending: false })

  return (
    <SalesClient 
      user={{ id: user.id, email: user.email }}
      profile={profile}
      initialLabRequests={(labRequests as LabRequest[]) || []}
    />
  )
}
