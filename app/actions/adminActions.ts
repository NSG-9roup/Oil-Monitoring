'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CustomerFormData, MachineFormData, ProductFormData, LabTestFormData, PurchaseFormData, UserFormData } from '@/lib/types'

/**
 * Helper to verify admin permissions and get the server client.
 */
async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error('Unauthorized: Please log in')
  }
  
  const { data: profile, error: profileError } = await supabase
    .from('oil_profiles')
    .select('role')
    .eq('id', user.id)
    .single()
    
  if (profileError || !profile || !['admin', 'sales'].includes(profile.role)) {
    throw new Error('Forbidden: Admin access required')
  }
  
  return supabase
}

// --- CUSTOMERS ---

export async function createCustomer(data: Partial<CustomerFormData>) {
  const supabase = await verifyAdmin()
  const { error } = await supabase.from('oil_customers').insert([data])
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  return { success: true }
}

export async function updateCustomer(id: string, data: Partial<CustomerFormData>) {
  const supabase = await verifyAdmin()
  const { error } = await supabase.from('oil_customers').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  return { success: true }
}

export async function deleteCustomer(id: string) {
  const supabase = await verifyAdmin()
  const { error } = await supabase.from('oil_customers').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  return { success: true }
}

// --- MACHINES ---

export async function createMachine(data: Partial<MachineFormData>) {
  const supabase = await verifyAdmin()
  const { error } = await supabase.from('oil_machines').insert([data])
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  return { success: true }
}

export async function updateMachine(id: string, data: Partial<MachineFormData>) {
  const supabase = await verifyAdmin()
  const { error } = await supabase.from('oil_machines').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  return { success: true }
}

export async function deleteMachine(id: string) {
  const supabase = await verifyAdmin()
  const { error } = await supabase.from('oil_machines').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  return { success: true }
}

// --- PRODUCTS ---

export async function createProduct(data: Partial<ProductFormData>) {
  const supabase = await verifyAdmin()
  const { error } = await supabase.from('oil_products').insert([data])
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  return { success: true }
}

export async function updateProduct(id: string, data: Partial<ProductFormData>) {
  const supabase = await verifyAdmin()
  const { error } = await supabase.from('oil_products').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  return { success: true }
}

export async function deleteProduct(id: string) {
  const supabase = await verifyAdmin()
  const { error } = await supabase.from('oil_products').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  return { success: true }
}

// --- TESTS ---

export async function createTest(data: Partial<LabTestFormData>) {
  const supabase = await verifyAdmin()
  const { error } = await supabase.from('oil_lab_tests').insert([data])
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  return { success: true }
}

export async function updateTest(id: string, data: Partial<LabTestFormData>) {
  const supabase = await verifyAdmin()
  const { error } = await supabase.from('oil_lab_tests').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  return { success: true }
}

export async function deleteTest(id: string) {
  const supabase = await verifyAdmin()
  const { error } = await supabase.from('oil_lab_tests').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  return { success: true }
}

// --- PURCHASES ---

export async function createPurchase(data: Partial<PurchaseFormData>) {
  const supabase = await verifyAdmin()
  const { error } = await supabase.from('oil_purchase_history').insert([data])
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  return { success: true }
}

export async function updatePurchase(id: string, data: Partial<PurchaseFormData>) {
  const supabase = await verifyAdmin()
  const { error } = await supabase.from('oil_purchase_history').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  return { success: true }
}

export async function deletePurchase(id: string) {
  const supabase = await verifyAdmin()
  const { error } = await supabase.from('oil_purchase_history').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin')
  return { success: true }
}

// --- USERS ---

export async function createUser(data: UserFormData & { action?: string }) {
  await verifyAdmin() // Verify the current user is an admin

  // Need service role for auth admin
  const { createClient: createServiceClient } = await import('@supabase/supabase-js')
  const supabaseService = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

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

  revalidatePath('/admin')
  return { success: true }
}

export async function updateUser(id: string, data: Partial<UserFormData> & { action?: string }) {
  await verifyAdmin()
  
  const { createClient: createServiceClient } = await import('@supabase/supabase-js')
  const supabaseService = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

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
  revalidatePath('/admin')
  return { success: true }
}

export async function deleteUser(id: string) {
  await verifyAdmin()
  
  const { createClient: createServiceClient } = await import('@supabase/supabase-js')
  const supabaseService = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error: authError } = await supabaseService.auth.admin.deleteUser(id)
  if (authError) throw new Error(authError.message)

  revalidatePath('/admin')
  return { success: true }
}
