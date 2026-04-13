import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
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
        logo_url,
        logo_updated_at
      )
    `)
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'customer') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600">You do not have customer access.</p>
        </div>
      </div>
    )
  }

  // Get machines for this customer - parallel with profile query for faster load
  const machinesPromise = supabase
    .from('oil_machines')
    .select('*')
    .eq('customer_id', profile.customer_id)
    .eq('status', 'active')
    .order('machine_name')

  const teamMembersPromise = supabase
    .from('oil_profiles')
    .select('id, full_name, email, phone_number, created_at')
    .eq('customer_id', profile.customer_id)
    .eq('role', 'customer')
    .order('created_at', { ascending: false })

  const maintenanceActionsPromise = supabase
    .from('oil_maintenance_actions')
    .select(`
      *,
      machine:oil_machines(machine_name, location),
      owner:oil_profiles!oil_maintenance_actions_owner_profile_id_fkey(full_name, email)
    `)
    .eq('customer_id', profile.customer_id)
    .order('created_at', { ascending: false })

  const maintenanceActionLogsPromise = supabase
    .from('oil_maintenance_action_logs')
    .select('id, action_id, actor_id, event_type, from_status, to_status, metadata, created_at')
    .order('created_at', { ascending: false })

  const purchaseHistoryPromise = supabase
    .from('oil_purchase_history')
    .select('id, quantity, unit_price, total_price, status, purchase_date')
    .eq('customer_id', profile.customer_id)
    .order('purchase_date', { ascending: false })
  
  const { data: machines } = await machinesPromise
  const { data: teamMembers } = await teamMembersPromise
  const { data: maintenanceActions } = await maintenanceActionsPromise
  const { data: maintenanceActionLogs } = await maintenanceActionLogsPromise
  const { data: purchaseHistory } = await purchaseHistoryPromise

  // Sanitize profile to only serializable data
  const sanitizedProfile = {
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email,
    role: profile.role,
    customer_id: profile.customer_id,
    customer: {
      id: profile.customer?.id,
      company_name: profile.customer?.company_name,
      status: profile.customer?.status,
      logo_url: profile.customer?.logo_url,
    },
  }

  return (
    <DashboardClient
      user={{ id: user.id, email: user.email }}
      profile={sanitizedProfile}
      initialMachines={machines || []}
      initialTeamMembers={teamMembers || []}
      initialMaintenanceActions={maintenanceActions || []}
      initialMaintenanceActionLogs={maintenanceActionLogs || []}
      initialPurchaseHistory={purchaseHistory || []}
    />
  )
}
