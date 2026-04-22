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

  // Fetch lab tests for this customer's machines
  const machineIds = (machines || []).map(m => m.id)
  const labTestsPromise = machineIds.length > 0
    ? supabase
        .from('oil_lab_tests')
        .select('id, machine_id, test_date, viscosity_40c, viscosity_100c, water_content, tan_value, evaluation_mode, product:product_id(product_name, product_type, baseline_viscosity_40c, baseline_viscosity_100c, baseline_tan), pdf_path, is_flagged, overall_status, recommendations, is_critical_trend, created_at')
        .in('machine_id', machineIds)
        .order('test_date', { ascending: false })
    : Promise.resolve({ data: [], error: null })

  // Fetch dismissed alerts states
  const alertReadsPromise = supabase
    .from('oil_alert_actions')
    .select('alert_key')
    .eq('action_type', 'customer_read')
    .eq('actor_id', profile.id)

  const [labTestsResult, alertReadsResult] = await Promise.all([
    labTestsPromise,
    alertReadsPromise
  ])

  if (labTestsResult.error) {
    console.error('[dashboard/page] primary lab test query failed:', labTestsResult.error.message)
  }

  let initialLabTests = labTestsResult.data || []

  // Fallback: query by customer via machine relation when primary query returns empty
  if (initialLabTests.length === 0 && profile.customer_id) {
    const fallbackLabTestsResult = await supabase
      .from('oil_lab_tests')
      .select('id, machine_id, test_date, viscosity_40c, viscosity_100c, water_content, tan_value, evaluation_mode, product:product_id(product_name, product_type, baseline_viscosity_40c, baseline_viscosity_100c, baseline_tan), pdf_path, is_flagged, overall_status, recommendations, is_critical_trend, created_at, machine:machine_id!inner(customer_id)')
      .eq('machine.customer_id', profile.customer_id)
      .order('test_date', { ascending: false })

    if (fallbackLabTestsResult.error) {
      console.error('[dashboard/page] fallback lab test query failed:', fallbackLabTestsResult.error.message)
    } else {
      initialLabTests = (fallbackLabTestsResult.data || []).map((row) => {
        const rest = { ...row }
        Reflect.deleteProperty(rest, 'machine')
        return rest
      })
    }
  }

  const initialDismissedAlertIds = (alertReadsResult.data || []).map(row => row.alert_key)

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
      initialLabTests={initialLabTests}
      initialDismissedAlertIds={initialDismissedAlertIds}
    />
  )
}
