'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CustomerFormData, MachineFormData, ProductFormData, LabTestFormData, UserFormData } from '@/lib/types'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Helper to verify admin permissions and get the server client.
 */
async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { session }, error: authError } = await supabase.auth.getSession()
  const user = session?.user
  
  if (authError || !user) {
    throw new Error('Unauthorized: Please log in')
  }
  
  const { data: profile, error: profileError } = await supabase
    .from('oil_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
    
  if (profileError || !profile || profile.role !== 'admin') {
    throw new Error('Forbidden: Admin access required')
  }
  
  return supabase
}

// --- CUSTOMERS ---

export async function createCustomer(data: Partial<CustomerFormData>) {
  const supabase = await verifyAdmin()
  const { error } = await supabase.from('oil_customers').insert([data])
  if (error) throw new Error(error.message)
  await createAuditLog('CREATE_CUSTOMER', `Created customer: ${data.company_name}`, { data })
  revalidatePath('/admin')
  return { success: true }
}

export async function updateCustomer(id: string, data: Partial<CustomerFormData>) {
  const supabase = await verifyAdmin()
  const { error } = await supabase.from('oil_customers').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  await createAuditLog('UPDATE_CUSTOMER', `Updated customer ID: ${id}`, { id, data })
  revalidatePath('/admin')
  return { success: true }
}

export async function deleteCustomer(id: string) {
  const supabase = await verifyAdmin()
  const { error } = await supabase.from('oil_customers').delete().eq('id', id)
  if (error) throw new Error(error.message)
  await createAuditLog('DELETE_CUSTOMER', `Deleted customer ID: ${id}`, { id })
  revalidatePath('/admin')
  return { success: true }
}

// --- MACHINES ---

export async function createMachine(data: Partial<MachineFormData>) {
  const supabase = await verifyAdmin()
  const { error } = await supabase.from('oil_machines').insert([data])
  if (error) throw new Error(error.message)
  await createAuditLog('CREATE_MACHINE', `Created machine: ${data.machine_name}`, { data })
  revalidatePath('/admin')
  return { success: true }
}

export async function updateMachine(id: string, data: Partial<MachineFormData>) {
  const supabase = await verifyAdmin()
  const { error } = await supabase.from('oil_machines').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  await createAuditLog('UPDATE_MACHINE', `Updated machine ID: ${id}`, { id, data })
  revalidatePath('/admin')
  return { success: true }
}

export async function deleteMachine(id: string) {
  const supabase = await verifyAdmin()
  const { error } = await supabase.from('oil_machines').delete().eq('id', id)
  if (error) throw new Error(error.message)
  await createAuditLog('DELETE_MACHINE', `Deleted machine ID: ${id}`, { id })
  revalidatePath('/admin')
  return { success: true }
}

// --- PRODUCTS ---

export async function createProduct(data: Partial<ProductFormData>) {
  const supabase = await verifyAdmin()
  const { error } = await supabase.from('oil_products').insert([data])
  if (error) throw new Error(error.message)
  await createAuditLog('CREATE_PRODUCT', `Created product: ${data.product_name}`, { data })
  revalidatePath('/admin')
  return { success: true }
}

export async function updateProduct(id: string, data: Partial<ProductFormData>) {
  const supabase = await verifyAdmin()
  const { error } = await supabase.from('oil_products').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  await createAuditLog('UPDATE_PRODUCT', `Updated product ID: ${id}`, { id, data })
  revalidatePath('/admin')
  return { success: true }
}

export async function deleteProduct(id: string) {
  const supabase = await verifyAdmin()
  const { error } = await supabase.from('oil_products').delete().eq('id', id)
  if (error) throw new Error(error.message)
  await createAuditLog('DELETE_PRODUCT', `Deleted product ID: ${id}`, { id })
  revalidatePath('/admin')
  return { success: true }
}

// --- TESTS ---

export async function createTest(data: Partial<LabTestFormData>) {
  const supabase = await verifyAdmin()
  const { error } = await supabase.from('oil_lab_tests').insert([data])
  if (error) throw new Error(error.message)
  await createAuditLog('CREATE_LAB_TEST', `Recorded lab test for machine ID: ${data.machine_id}`, { data })
  revalidatePath('/admin')
  return { success: true }
}

export async function updateTest(id: string, data: Partial<LabTestFormData>) {
  const supabase = await verifyAdmin()
  const { error } = await supabase.from('oil_lab_tests').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  await createAuditLog('UPDATE_LAB_TEST', `Updated lab test ID: ${id}`, { id, data })
  revalidatePath('/admin')
  return { success: true }
}

export async function deleteTest(id: string) {
  const supabase = await verifyAdmin()
  const { error } = await supabase.from('oil_lab_tests').delete().eq('id', id)
  if (error) throw new Error(error.message)
  await createAuditLog('DELETE_LAB_TEST', `Deleted lab test ID: ${id}`, { id })
  revalidatePath('/admin')
  return { success: true }
}

// --- USERS ---

export async function createUser(data: UserFormData & { action?: string }) {
  await verifyAdmin() // Verify the current user is an admin

  // Need service role for auth admin
  const supabaseService = createServiceClient()

  const email = data.email.toLowerCase()
  const fullName = data.full_name?.trim()
  const contactEmail = data.contact_email?.toLowerCase() || null
  const phoneNumber = data.phone_number?.trim() || null
  const customerId = data.role === 'customer' ? data.customer_id : null

  const { data: authData, error: authError } = await supabaseService.auth.admin.createUser({
    email,
    password: data.password,
    email_confirm: true,
  })

  if (authError) throw new Error(authError.message)

  const { error: profileError } = await supabaseService
    .from('oil_profiles')
    .insert([{
      id: authData.user.id,
      full_name: fullName,
      email: contactEmail,
      phone_number: phoneNumber,
      role: data.role,
      customer_id: customerId,
    }])

  if (profileError) {
    await supabaseService.auth.admin.deleteUser(authData.user.id)
    throw new Error(profileError.message)
  }

  await createAuditLog('CREATE_USER', `Created user email: ${data.email} with role: ${data.role}`, { email: data.email, role: data.role })
  revalidatePath('/admin')
  return { success: true }
}

export async function updateUser(id: string, data: Partial<UserFormData> & { action?: string }) {
  await verifyAdmin()
  
  const supabaseService = createServiceClient()

  const contactEmail = data.contact_email?.toLowerCase() || null
  const phoneNumber = data.phone_number?.trim() || null
  const customerId = data.role === 'customer' ? data.customer_id : null

  const { error } = await supabaseService
    .from('oil_profiles')
    .update({
      full_name: data.full_name?.trim(),
      email: contactEmail,
      phone_number: phoneNumber,
      role: data.role,
      customer_id: customerId,
    })
    .eq('id', id)

  if (error) throw new Error(error.message)
  await createAuditLog('UPDATE_USER', `Updated user ID: ${id} details`, { id, role: data.role })
  revalidatePath('/admin')
  return { success: true }
}

export async function deleteUser(id: string) {
  await verifyAdmin()
  
  const supabaseService = createServiceClient()

  const { error: authError } = await supabaseService.auth.admin.deleteUser(id)
  if (authError) throw new Error(authError.message)

  await createAuditLog('DELETE_USER', `Deleted user ID: ${id}`, { id })
  revalidatePath('/admin')
  return { success: true }
}

export async function uploadAdminFile(formData: FormData) {
  await verifyAdmin()
  
  const bucket = formData.get('bucket') as string
  const path = formData.get('path') as string
  const file = formData.get('file') as File

  if (!bucket || !path || !file) throw new Error('Missing upload parameters')

  const supabaseService = createServiceClient()

  let attempt = 0
  const retries = 3
  const delayMs = 1000
  let uploadData: { path: string } | null = null
  let uploadError: unknown = null

  while (attempt < retries) {
    try {
      const { data, error } = await supabaseService.storage
        .from(bucket)
        .upload(path, file, { 
          upsert: true, 
          contentType: file.type 
        })
      
      if (!error) {
        uploadData = data
        uploadError = null
        break
      }
      
      uploadError = error
      console.warn(`[Admin Storage Upload] Attempt ${attempt + 1} failed: ${error.message}`)
      attempt++
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)))
      }
    } catch (err) {
      uploadError = err
      console.warn(`[Admin Storage Upload] Attempt ${attempt + 1} threw exception:`, err)
      attempt++
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)))
      }
    }
  }

  if (uploadError) {
    const errMsg = uploadError instanceof Error ? uploadError.message : String(uploadError)
    throw new Error(errMsg)
  }
  
  await createAuditLog('UPLOAD_FILE', `Uploaded file to bucket: ${bucket} at path: ${path}`, { bucket, path })
  return { path: uploadData!.path }
}

/**
 * Helper to verify admin or sales permissions and get the server client.
 */
async function verifyAdminOrSales() {
  const supabase = await createClient()
  const { data: { session }, error: authError } = await supabase.auth.getSession()
  const user = session?.user
  
  if (authError || !user) {
    throw new Error('Unauthorized: Please log in')
  }
  
  const { data: profile, error: profileError } = await supabase
    .from('oil_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
    
  if (profileError || !profile || (profile.role !== 'admin' && profile.role !== 'sales')) {
    throw new Error('Forbidden: Admin or Sales access required')
  }
  
  return { supabase, user, profile }
}

/**
 * Server action to approve a new machine request.
 * Creates the machine and updates the lab request.
 */
export async function approveNewMachine(
  requestId: string,
  customerId: string,
  machineName: string,
  location?: string | null
) {
  await verifyAdminOrSales()
  
  const supabaseService = createServiceClient()

  // 1. Insert new machine using service role client to bypass sales RLS constraints
  const { data: newMachine, error: insertErr } = await supabaseService
    .from('oil_machines')
    .insert({
      customer_id: customerId,
      machine_name: machineName.trim(),
      location: location?.trim() || null,
      status: 'active'
    })
    .select()
    .single()

  if (insertErr) {
    console.error('Error inserting new machine via approveNewMachine action:', insertErr)
    throw new Error(insertErr.message)
  }

  // 2. Link machine_id to the lab request and set is_new_machine to false
  const { error: requestErr } = await supabaseService
    .from('oil_lab_requests')
    .update({
      machine_id: newMachine.id,
      is_new_machine: false
    })
    .eq('id', requestId)

  if (requestErr) {
    console.error('Error linking machine to request via approveNewMachine action:', requestErr)
    // Rollback machine insertion if linking fails
    await supabaseService.from('oil_machines').delete().eq('id', newMachine.id)
    throw new Error(requestErr.message)
  }

  await createAuditLog('APPROVE_NEW_MACHINE', `Approved and created machine: ${machineName} for customer ID: ${customerId}`, { requestId, customerId, machineName })
  revalidatePath('/sales')
  revalidatePath('/admin')
  revalidatePath('/dashboard')

  return { success: true, machine: newMachine }
}

/**
 * Server action to log critical operations to public.oil_audit_logs.
 * Runs with elevated credentials to bypass RLS restrictions on writing logs.
 */
export async function createAuditLog(
  action: string,
  details?: string | null,
  metadata: Record<string, unknown> = {}
) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    const actorId = user?.id || null

    const supabaseService = createServiceClient()

    const { error } = await supabaseService
      .from('oil_audit_logs')
      .insert({
        actor_id: actorId,
        action,
        details: details || null,
        metadata
      })

    if (error) {
      console.error('Failed to write audit log:', error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (e) {
    console.error('Error in createAuditLog:', e)
    return { success: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

/**
 * Fetch all email logs for the admin panel.
 */
export async function getEmailLogs() {
  const supabase = await createClient()
  const { data: { session }, error: authError } = await supabase.auth.getSession()
  const user = session?.user
  
  if (authError || !user) {
    throw new Error('Unauthorized: Please log in')
  }
  
  const { data: profile } = await supabase
    .from('oil_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
    
  if (!profile || profile.role !== 'admin') {
    throw new Error('Forbidden: Admin access required')
  }

  const supabaseService = createServiceClient()
  const { data, error } = await supabaseService
    .from('oil_email_logs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}


