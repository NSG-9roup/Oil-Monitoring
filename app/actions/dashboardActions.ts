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
  try {
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

    const adminSupabase = createServiceClient()

    const { error } = await adminSupabase.from('oil_lab_requests').insert([insertData])
    if (error) {
      console.error('Error creating lab request:', error)
      return { success: false, error: error.message }
    }
    
    await createAuditLog('CREATE_LAB_REQUEST', `Created lab request: ${data.title}`, { title: data.title, is_new_machine: data.is_new_machine })

    revalidatePath('/dashboard')
    return { success: true }
  } catch (err) {
    console.error('Error in createLabRequest:', err)
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Shared server action to update the authenticated user's own profile columns (full_name and phone_number).
 */
export async function updateAnyUserProfile(data: {
  full_name: string
  phone_number?: string
}) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    if (!data.full_name || data.full_name.trim().length < 2) {
      return { success: false, error: 'Name must be at least 2 characters' }
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
      return { success: false, error: error.message }
    }

    await createAuditLog('UPDATE_PROFILE', `User updated profile info`, { userId: user.id })

    revalidatePath('/dashboard/profile')
    return { success: true }
  } catch (err) {
    console.error('Error in updateAnyUserProfile:', err)
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function createOrderQuotation(data: {
  productId: string
  quantity: number
}) {
  try {
    const { profile } = await verifyCustomer()

    if (!data.productId || data.quantity <= 0) {
      return { success: false, error: 'Produk dan kuantitas valid harus diisi' }
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
      return { success: false, error: error.message }
    }

    await createAuditLog('CREATE_ORDER_QUOTATION', `Permintaan penawaran dibuat`, { productId: data.productId, quantity: data.quantity })

    revalidatePath('/dashboard')
    return { success: true, data: newOrder }
  } catch (err) {
    console.error('Error in createOrderQuotation:', err)
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function createCustomerComplaint(data: {
  orderId: string
  description: string
}) {
  try {
    const { profile } = await verifyCustomer()

    if (!data.orderId || !data.description?.trim()) {
      return { success: false, error: 'Pesanan dan deskripsi komplain wajib diisi' }
    }

    const supabaseService = createServiceClient()
    const descText = data.description.trim()
    const { data: newComplaint, error } = await supabaseService
      .from('oil_complaints')
      .insert([{
        order_id: data.orderId,
        customer_id: profile.customer_id,
        description: descText,
        complaint_text: descText,
        status: 'open'
      }])
      .select(`*, order:oil_orders(id, product:oil_products(product_name))`)
      .single()

    if (error) {
      console.error('Error creating customer complaint:', error)
      return { success: false, error: error.message }
    }

    await createAuditLog('CREATE_COMPLAINT', `Customer filed complaint for order ID: ${data.orderId}`, { orderId: data.orderId, description: data.description })

    revalidatePath('/dashboard')
    revalidatePath('/admin')
    return { success: true, data: newComplaint }
  } catch (err) {
    console.error('Error in createCustomerComplaint:', err)
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

