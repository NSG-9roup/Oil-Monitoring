import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SalesClient from './SalesClient'

export default async function SalesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

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
        status,
        logo_url
      )
    `)
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'sales') {
    // If not sales, maybe they are admin or customer
    if (profile?.role === 'admin') redirect('/admin')
    if (profile?.role === 'customer') redirect('/dashboard')
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600">You do not have sales access.</p>
        </div>
      </div>
    )
  }

  // Fetch all "Lab Test Request" actions that are not completed
  const { data: actions } = await supabase
    .from('oil_maintenance_actions')
    .select(`
      *,
      machine:oil_machines(machine_name, location, serial_number, model),
      customer:oil_customers(company_name, logo_url)
    `)
    .eq('status', 'open')
    .ilike('title', '%Lab Test Request%')
    .order('created_at', { ascending: false })

  return (
    <SalesClient 
      user={{ id: user.id, email: user.email }}
      profile={profile}
      initialActions={actions || []}
    />
  )
}
