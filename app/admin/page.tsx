import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminClient from './AdminClient'

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
    .select('*')
    .eq('id', user.id)
    .single()

  // Check if user is admin
  if (!profile || !['admin', 'sales'].includes(profile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600">You do not have admin access.</p>
          <p className="text-xs text-gray-500 mt-2">User: {user.email}</p>
          <p className="text-xs text-gray-500">Role: {profile?.role || 'none'}</p>
          {profileError && <p className="text-xs text-red-500 mt-2">{profileError.message}</p>}
        </div>
      </div>
    )
  }

  // Get all customers with machine count
  const { data: customers } = await supabase
    .from('oil_customers')
    .select(`
      *,
      machines:oil_machines(count)
    `)
    .order('company_name')

  // Get all machines
  const { data: machines } = await supabase
    .from('oil_machines')
    .select(`
      *,
      customer:oil_customers(company_name),
      lab_tests:oil_lab_tests(count)
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  // Get recent lab tests
  const { data: recentTests } = await supabase
    .from('oil_lab_tests')
    .select(`
      *,
      machine:machine_id(machine_name, customer_id),
      product:product_id(product_name)
    `)
    .order('test_date', { ascending: false })
    .limit(20)

  return (
    <AdminClient
      user={user}
      profile={profile}
      customers={customers || []}
      machines={machines || []}
      recentTests={recentTests || []}
    />
  )
}
