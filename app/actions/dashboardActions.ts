'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createAuditLog } from '@/app/actions/adminActions'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Helper to verify customer permissions and get their profile
 */
async function verifyCustomer() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error('Unauthorized')
  }
  
  const { data: profile, error: profileError } = await supabase
    .from('oil_profiles')
    .select('id, role, customer_id')
    .eq('id', user.id)
    .single()
    
  if (profileError || !profile || profile.role !== 'customer') {
    throw new Error('Forbidden: Customer access required')
  }
  
  return { supabase, user, profile }
}

export async function createLabRequest(data: {
  machine_id?: string
  title: string
  description: string
  due_date?: string
  priority: string
  is_new_machine: boolean
  assigned_to_profile_id?: string
  new_machine_data?: {
    machine_name: string
    model?: string
    location?: string
  }
}) {
  const { profile } = await verifyCustomer()

  // Store lab request in oil_lab_requests table
  const insertData = {
    customer_id: profile.customer_id,
    requested_by_profile_id: profile.id,
    machine_id: data.machine_id ? data.machine_id : undefined,
    title: data.title,
    description: data.description,
    due_date: data.due_date || null,
    priority: data.priority,
    status: 'pending',
    is_new_machine: data.is_new_machine,
    new_machine_data: data.is_new_machine ? data.new_machine_data : null,
    assigned_to_profile_id: data.assigned_to_profile_id || null,
  }

  // Use admin client to bypass broken RLS that relies on missing JWT custom claims
  const adminSupabase = createServiceClient()

  const { error } = await adminSupabase.from('oil_lab_requests').insert([insertData])
  if (error) {
    console.error('Error creating lab request:', error)
    throw new Error(error.message)
  }
  
  await createAuditLog('CREATE_LAB_REQUEST', `Created lab request: ${data.title}`, { title: data.title, is_new_machine: data.is_new_machine })

  revalidatePath('/dashboard')
  revalidatePath('/sales')
  revalidatePath('/admin')
  return { success: true }
}

/**
 * Shared server action to update the authenticated user's own profile columns (full_name and phone_number).
 * Bypasses direct RLS restrictions by using the service client after verifying identity.
 */
export async function updateAnyUserProfile(data: {
  full_name: string
  phone_number?: string
}) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  if (!data.full_name || data.full_name.trim().length < 2) {
    throw new Error('Name must be at least 2 characters')
  }

  const supabaseService = createServiceClient()
  const { error } = await supabaseService
    .from('oil_profiles')
    .update({
      full_name: data.full_name.trim(),
      phone_number: data.phone_number?.trim() || null,
    })
    .eq('id', user.id)

  if (error) {
    throw new Error(error.message)
  }

  // Audit logging for profile updates
  await createAuditLog('UPDATE_PROFILE', `User updated profile info`, { userId: user.id })

  revalidatePath('/dashboard/profile')
  revalidatePath('/sales/profile')
  revalidatePath('/admin')
  return { success: true }
}

export async function createOrderQuotation(data: {
  productId: string
  quantity: number
}) {
  const { profile } = await verifyCustomer()

  if (!data.productId || data.quantity <= 0) {
    throw new Error('Produk dan kuantitas valid harus diisi')
  }

  const supabaseService = createServiceClient()
  const { data: newOrder, error } = await supabaseService
    .from('oil_orders')
    .insert([{
      customer_id: profile.customer_id,
      product_id: data.productId,
      quantity: data.quantity,
      status: 'pending'
    }])
    .select(`*, product:oil_products(product_name, product_type)`)
    .single()

  if (error) {
    console.error('Error creating order quotation:', error)
    throw new Error(error.message)
  }

  await createAuditLog('CREATE_ORDER_QUOTATION', `Permintaan penawaran dibuat`, { productId: data.productId, quantity: data.quantity })

  revalidatePath('/dashboard')
  revalidatePath('/admin')
  revalidatePath('/sales')
  return { success: true, data: newOrder }
}


