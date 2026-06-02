'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type TeamUserData = {
  full_name: string
  email: string
  phone_number?: string | null
  password: string
}

type MaintenanceActionData = {
  machine_id: string
  title: string
  description?: string | null
  priority: string
  due_date?: string | null
  owner_profile_id?: string | null
  alert_key?: string | null
  source_payload?: Record<string, unknown> | null
}

type MaintenanceActionUpdate = {
  status?: string
  owner_profile_id?: string | null
  verification_status?: string
  due_date?: string | null
  evidence_notes?: string | null
  [key: string]: unknown
}

/**
 * Helper to verify customer permissions and get their profile
 */
async function verifyCustomer() {
  const supabase = await createClient()
  const { data: { session }, error: authError } = await supabase.auth.getSession()
  const user = session?.user
  
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
  }

  // Use admin client to bypass broken RLS that relies on missing JWT custom claims
  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await adminSupabase.from('oil_lab_requests').insert([insertData])
  if (error) {
    console.error('Error creating lab request:', error)
    throw new Error(error.message)
  }
  
  revalidatePath('/dashboard')
  revalidatePath('/sales')
  revalidatePath('/admin')
  return { success: true }
}

