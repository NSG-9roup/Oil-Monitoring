import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminClient from './AdminClient'
import type { AdminProfile, AdminUser } from '@/lib/types'

export default async function AdminPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('oil_profiles')
    .select('id, full_name, email, phone_number, role, customer_id, created_at, updated_at, customer:oil_customers(id, company_name, status, logo_url, created_at, updated_at)')
    .eq('id', user.id)
    .single()

  const normalizedProfile: AdminProfile | null = profile
    ? {
        ...profile,
        customer: Array.isArray(profile.customer)
          ? profile.customer[0] ?? null
          : profile.customer ?? null,
      }
    : null

  // Check if user is admin
  if (!normalizedProfile || !['admin', 'sales'].includes(normalizedProfile.role)) {
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

  // Run all queries in parallel for faster initial load
  const [customersResult, machinesResult, recentTestsResult, productsResult, usersResult, purchasesResult] = await Promise.all([
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
        machine:machine_id(machine_name, customer_id),
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
    supabase
      .from('oil_purchase_history')
      .select('*, customer:oil_customers(company_name), product:oil_products(product_name)')
      .order('purchase_date', { ascending: false })
  ])

  const customers = customersResult.data
  const machines = machinesResult.data
  const recentTests = recentTestsResult.data
  const products = productsResult.data
  const users = usersResult.data
  const purchases = purchasesResult.data
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
      initialPurchases={purchases || []}
    />
  )
}
