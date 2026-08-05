import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SalesClient from './SalesClient'
import type { LabRequest } from '@/lib/types'
import { createServiceClient } from '@/lib/supabase/service'

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
        status
      )
    `)
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }



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
  const adminSupabase = createServiceClient()

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

  const { data: initialOrders } = await adminSupabase
    .from('oil_orders')
    .select(`
      *,
      customer:oil_customers(company_name),
      product:oil_products(product_name, product_type)
    `)
    .order('created_at', { ascending: false })

  const { data: initialCustomers } = await adminSupabase
    .from('oil_customers')
    .select('id, company_name')
    .order('company_name', { ascending: true })

  const { data: initialProducts } = await adminSupabase
    .from('oil_products')
    .select('id, product_name, product_type')
    .order('product_name', { ascending: true })

  return (
    <SalesClient 
      user={{ id: user.id, email: user.email }}
      profile={profile}
      initialLabRequests={(labRequests as LabRequest[]) || []}
      initialOrders={initialOrders || []}
      initialCustomers={initialCustomers || []}
      initialProducts={initialProducts || []}
    />
  )
}
