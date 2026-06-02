import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminClient from './AdminClient'
import type { AdminProfile, AdminUser, LabRequest } from '@/lib/types'

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: { session }, error } = await supabase.auth.getSession()
  const user = session?.user
  console.log('[Admin Page] getSession result:', user?.id, 'Error:', error)
  if (error) {
    console.error('SUPABASE GETSESSION ERROR IN ADMIN PAGE:', error)
  }

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('oil_profiles')
    .select('id, full_name, email, phone_number, role, customer_id, created_at, updated_at, customer:oil_customers(id, company_name, status, created_at, updated_at)')
    .eq('id', user.id)
    .single()

  console.log('[Admin Page] profile fetch result:', profile?.role, 'Error:', profileError)

  const normalizedProfile: AdminProfile | null = profile
    ? {
        ...profile,
        customer: Array.isArray(profile.customer)
          ? profile.customer[0] ?? null
          : profile.customer ?? null,
      }
    : null

  if (!normalizedProfile) {
    console.log('[Admin Page] Redirecting to /login because normalizedProfile is NULL')
    redirect('/login')
  }

  if (normalizedProfile.role === 'sales') {
    console.log('[Admin Page] Redirecting to /sales')
    redirect('/sales')
  }

  if (normalizedProfile.role === 'customer') {
    console.log('[Admin Page] Redirecting to /dashboard')
    redirect('/dashboard')
  }

  console.log('[Admin Page] Role is admin, proceeding to render.')

  // Check if user is admin
  if (normalizedProfile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600">You do not have admin access.</p>
          <p className="text-xs text-gray-500 mt-2">User: {user.email}</p>
          <p className="text-xs text-gray-500">Role: {normalizedProfile?.role || 'none'}</p>
          {profileError && <p className="text-xs text-red-500 mt-2">{profileError.message}</p>}
        </div>
      </div>
    )
  }

  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [customersResult, machinesResult, recentTestsResult, productsResult, usersResult, labRequestsResult] = await Promise.all([
    supabase
      .from('oil_customers')
      .select(`
        *,
        machines:oil_machines(count)
      `)
      .order('company_name'),
    supabase
      .from('oil_machines')
      .select(`
        *,
        customer:oil_customers(company_name),
        lab_tests:oil_lab_tests(count)
      `)
      .order('machine_name'),
    supabase
      .from('oil_lab_tests')
      .select(`
        *,
        machine:oil_machines(
          machine_name,
          customer_id,
          customer:oil_customers(company_name)
        ),
        product:product_id(product_name)
      `)
      .order('test_date', { ascending: false }),
    supabase
      .from('oil_products')
      .select('*')
      .order('id'),
    supabase
      .from('oil_profiles')
      .select('id, full_name, email, phone_number, role, customer_id, created_at, updated_at, customer:oil_customers(company_name)')
      .order('created_at', { ascending: false }),
    adminSupabase
      .from('oil_lab_requests')
      .select(`
        *,
        machine:oil_machines(machine_name, location),
        customer:oil_customers(company_name),
        requested_by:oil_profiles!oil_lab_requests_requested_by_profile_id_fkey(full_name, email)
      `)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
  ])

  const customers = customersResult.data
  const machines = machinesResult.data
  const recentTests = recentTestsResult.data
  const products = productsResult.data
  const users = usersResult.data
  const labRequests = labRequestsResult.data as LabRequest[] | null
  const normalizedUsers = (users || []).map((row) => ({
    ...row,
    customer: Array.isArray(row.customer)
      ? row.customer[0] ?? null
      : row.customer ?? null,
  })) as AdminUser[]

  return (
    <AdminClient
      user={user}
      profile={normalizedProfile}
      customers={customers || []}
      machines={machines || []}
      recentTests={recentTests || []}
      initialProducts={products || []}
      initialUsers={normalizedUsers}
      initialLabRequests={labRequests || []}
    />
  )
}
