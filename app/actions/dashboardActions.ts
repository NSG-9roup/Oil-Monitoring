'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type TeamUserData = {
  full_name: string
  email: string
  phone_number?: string | null
  admin_pin: string
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

export async function createTeamUser(data: TeamUserData) {
  const { profile } = await verifyCustomer()

  const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
  const supabaseService = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: authData, error: authError } = await supabaseService.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
  })

  if (authError) throw new Error(authError.message)

  const { error: profileError } = await supabaseService
    .from('oil_profiles')
    .insert([{
      id: authData.user.id,
      full_name: data.full_name,
      email: data.email,
      phone_number: data.phone_number,
      role: 'customer',
      customer_id: profile.customer_id,
    }])

  if (profileError) {
    await supabaseService.auth.admin.deleteUser(authData.user.id)
    throw new Error(profileError.message)
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function createMaintenanceAction(data: MaintenanceActionData) {
  const { supabase, profile } = await verifyCustomer()
  const insertData = { ...data, customer_id: profile.customer_id }
  const { error } = await supabase.from('oil_maintenance_actions').insert([insertData])
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateMaintenanceAction(id: string, data: MaintenanceActionUpdate) {
  const { supabase } = await verifyCustomer()
  const { error } = await supabase.from('oil_maintenance_actions').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
  return { success: true }
}

export async function dismissAlert(alertKey: string) {
  const { supabase, profile, user } = await verifyCustomer()
  const { error } = await supabase.from('oil_alert_actions').upsert({
    alert_key: alertKey,
    actor_id: profile.id || user.id,
    action_type: 'customer_read',
    metadata: {
      read_at: new Date().toISOString()
    }
  }, {
    onConflict: 'alert_key, actor_id, action_type'
  })
  
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard')
  return { success: true }
}

export async function requestLabTest(data: {
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
  const { supabase, profile } = await verifyCustomer()

  const insertData = {
    customer_id: profile.customer_id,
    machine_id: data.machine_id || null,
    title: data.title,
    description: data.description,
    due_date: data.due_date || null,
    priority: data.priority,
    status: 'open',
    source_payload: {
      is_new_machine: data.is_new_machine,
      new_machine_data: data.new_machine_data
    }
  }

  const { error } = await supabase.from('oil_maintenance_actions').insert([insertData])
  if (error) throw new Error(error.message)
  
  revalidatePath('/dashboard')
  revalidatePath('/sales')
  return { success: true }
}

export async function updateActionStatus(actionId: string, status: string, notes?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: actorProfile, error: actorProfileError } = await supabase
    .from('oil_profiles')
    .select('role, customer_id')
    .eq('id', user.id)
    .single()

  if (actorProfileError || !actorProfile) {
    throw new Error('Forbidden')
  }

  const { data: targetAction, error: targetActionError } = await supabase
    .from('oil_maintenance_actions')
    .select('customer_id')
    .eq('id', actionId)
    .single()

  if (targetActionError || !targetAction) {
    throw new Error('Action not found')
  }

  const canManageAll = actorProfile.role === 'admin' || actorProfile.role === 'sales'
  const canManageOwnCustomer =
    actorProfile.role === 'customer' &&
    !!actorProfile.customer_id &&
    actorProfile.customer_id === targetAction.customer_id

  if (!canManageAll && !canManageOwnCustomer) {
    throw new Error('Forbidden')
  }

  const updateData: {
    status: string
    evidence_notes?: string
    completed_at?: string
  } = { status }
  if (notes) updateData.evidence_notes = notes
  if (status === 'completed') updateData.completed_at = new Date().toISOString()

  const { error } = await supabase
    .from('oil_maintenance_actions')
    .update(updateData)
    .eq('id', actionId)

  if (error) throw new Error(error.message)
  
  revalidatePath('/dashboard')
  revalidatePath('/sales')
  revalidatePath('/admin')
  return { success: true }
}

export async function registerMachineFromAction(actionId: string, machineData: {
  customer_id: string
  machine_name: string
  model?: string
  location?: string
  serial_number?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Verify admin access
  const { data: profile } = await supabase.from('oil_profiles').select('role').eq('id', user?.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden: Admin access required')

  // 1. Create the machine
  const { data: machine, error: machineError } = await supabase
    .from('oil_machines')
    .insert([{
      customer_id: machineData.customer_id,
      machine_name: machineData.machine_name,
      model: machineData.model,
      location: machineData.location,
      serial_number: machineData.serial_number,
      status: 'active'
    }])
    .select()
    .single()

  if (machineError) throw new Error(machineError.message)

  // 2. Update the action with the new machine_id and mark as assigned (or in_progress)
  const { error: actionError } = await supabase
    .from('oil_maintenance_actions')
    .update({ 
      machine_id: machine.id,
      title: `Lab Test Request: ${machine.machine_name}` 
    })
    .eq('id', actionId)

  if (actionError) throw new Error(actionError.message)

  revalidatePath('/dashboard')
  revalidatePath('/admin')
  return { success: true, machineId: machine.id }
}
