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

  const { data: machines } = await machinesPromise
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: teamMembers } = await teamMembersPromise

  // Initialize service client for fallback (RLS issues)
  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const supabaseService = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Fetch Maintenance Actions with fallback
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let maintenanceActions: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let actionsError: any = null
  const result = await supabase
    .from('oil_maintenance_actions')
    .select(`
      *,
      machine:oil_machines(machine_name, location),
      owner:oil_profiles!oil_maintenance_actions_owner_profile_id_fkey(full_name, email)
    `)
    .eq('customer_id', profile.customer_id)
    .order('created_at', { ascending: false })
  
  if (result.error) {
    actionsError = result.error
  } else {
    maintenanceActions = result.data
  }

  if ((!maintenanceActions || maintenanceActions.length === 0) && !actionsError) {
    const fallback = await supabaseService
      .from('oil_maintenance_actions')
      .select(`
        *,
        machine:oil_machines(machine_name, location),
        owner:oil_profiles!oil_maintenance_actions_owner_profile_id_fkey(full_name, email)
      `)
      .eq('customer_id', profile.customer_id)
      .order('created_at', { ascending: false })
    maintenanceActions = fallback.data
  }

  // Fetch Logs with fallback
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let maintenanceActionLogs: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let logsError: any = null
  const logsResult = await supabase
    .from('oil_maintenance_action_logs')
    .select('id, action_id, actor_id, event_type, from_status, to_status, metadata, created_at')
    .order('created_at', { ascending: false })
  
  if (logsResult.error) {
    logsError = logsResult.error
  } else {
    maintenanceActionLogs = logsResult.data
  }

  if ((!maintenanceActionLogs || maintenanceActionLogs.length === 0) && !logsError) {
    const fallback = await supabaseService
      .from('oil_maintenance_action_logs')
      .select('id, action_id, actor_id, event_type, from_status, to_status, metadata, created_at')
      .order('created_at', { ascending: false })
    maintenanceActionLogs = fallback.data
  }

  // Fetch lab tests for this customer's machines
  const machineIds = (machines || []).map(m => m.id)
  const labTestsPromise = machineIds.length > 0
    ? supabase
        .from('oil_lab_tests')
        .select(`
          id, machine_id, test_date, viscosity_40c, viscosity_100c, water_content,
          tan_value, pdf_path, created_at,
          product:product_id(product_name, product_type, baseline_viscosity_40c, baseline_viscosity_100c, baseline_tan)
        `)
        .in('machine_id', machineIds)
        .order('test_date', { ascending: false })
    : Promise.resolve({ data: [], error: null })

  const [labTestsResult] = await Promise.all([labTestsPromise])

  let initialLabTests = labTestsResult.data || []

  // Fallback for lab tests
  if (initialLabTests.length === 0 && profile.customer_id && machineIds.length > 0) {
    const fallbackLabTestsResult = await supabaseService
      .from('oil_lab_tests')
      .select(`
        id, machine_id, test_date, viscosity_40c, viscosity_100c, water_content,
        tan_value, pdf_path, created_at,
        product:product_id(product_name, product_type, baseline_viscosity_40c, baseline_viscosity_100c, baseline_tan)
      `)
      .in('machine_id', machineIds)
      .order('test_date', { ascending: false })

    if (!fallbackLabTestsResult.error) {
      initialLabTests = fallbackLabTestsResult.data || []
    }
  }

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
      initialMaintenanceActions={maintenanceActions || []}
      initialLabTests={initialLabTests}
    />
  )
}
