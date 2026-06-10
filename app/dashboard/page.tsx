import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
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
        status,
        logo_url
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

  // Get machines for this customer
  const machinesPromise = supabase
    .from('oil_machines')
    .select('*')
    .eq('customer_id', profile.customer_id)
    .order('machine_name')

  const salesTeamPromise = supabase
    .from('oil_profiles')
    .select('id, full_name')
    .eq('role', 'sales')
    .order('full_name')

  const { data: machines } = await machinesPromise
  const { data: initialSalesTeam } = await salesTeamPromise

  // Fetch lab tests for this customer's machines (securely scoped by RLS)
  const machineIds = (machines || []).map(m => m.id)
  const labTestsPromise = machineIds.length > 0
    ? supabase
        .from('oil_lab_tests')
        .select(`
          id, machine_id, test_date, viscosity_40c, viscosity_100c, water_content, water_content_unit,
          tan_value, pdf_path, created_at,
          product:product_id(product_name, product_type, baseline_viscosity_40c, baseline_viscosity_100c, baseline_tan)
        `)
        .in('machine_id', machineIds)
        .order('test_date', { ascending: false })
    : Promise.resolve({ data: [], error: null })

  // Fetch lab requests (securely scoped by RLS)
  const labRequestsPromise = profile.customer_id
    ? supabase
        .from('oil_lab_requests')
        .select(`
          *,
          machine:oil_machines(machine_name, location),
          assigned_to:oil_profiles!oil_lab_requests_assigned_to_profile_id_fkey(full_name)
        `)
        .eq('customer_id', profile.customer_id)
        .order('created_at', { ascending: false })
    : Promise.resolve({ data: [], error: null })

  const productsPromise = supabase
    .from('oil_products')
    .select('*')
    .order('product_name')

  const ordersPromise = profile.customer_id
    ? supabase
        .from('oil_orders')
        .select(`
          *,
          product:product_id(product_name, product_type)
        `)
        .eq('customer_id', profile.customer_id)
        .order('created_at', { ascending: false })
    : Promise.resolve({ data: [], error: null })

  const [labTestsResult, labRequestsResult, productsResult, ordersResult] = await Promise.all([
    labTestsPromise,
    labRequestsPromise,
    productsPromise,
    ordersPromise,
  ])

  const initialLabTests = labTestsResult.data || []
  const initialLabRequests = labRequestsResult.data || []
  const products = productsResult.data || []
  const initialOrders = ordersResult.data || []

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
      initialLabTests={initialLabTests}
      initialLabRequests={initialLabRequests}
      initialSalesTeam={initialSalesTeam || []}
      products={products}
      initialOrders={initialOrders}
    />
  )
}
