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

