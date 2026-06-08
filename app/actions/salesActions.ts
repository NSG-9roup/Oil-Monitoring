'use server'

import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from './adminActions'
import { revalidatePath } from 'next/cache'

async function verifySalesOrAdmin() {
  const supabase = await createClient()
  const { data: { session }, error: authError } = await supabase.auth.getSession()
  const user = session?.user
  
  if (authError || !user) {
    throw new Error('Unauthorized: Please log in')
  }

  const { data: profile, error: profileError } = await supabase
    .from('oil_profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile || (profile.role !== 'sales' && profile.role !== 'admin')) {
    throw new Error('Forbidden: Sales or Admin role required')
  }

  return { supabase, user, profile }
}

/**
 * Update request status from sales dashboard
 */
export async function updateLabRequestStatusSales(requestId: string, status: string) {
  const { user } = await verifySalesOrAdmin()

  const { createClient: createServiceClient } = await import('@supabase/supabase-js')
  const supabaseService = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error: updateError } = await supabaseService
    .from('oil_lab_requests')
    .update({ 
      status,
      assigned_to_profile_id: status === 'sampling' ? user.id : undefined
    })
    .eq('id', requestId)

  if (updateError) {
    throw new Error(updateError.message)
  }

  await createAuditLog(
    'SALES_UPDATE_REQUEST_STATUS', 
    `Sales updated lab request ID: ${requestId} status to: ${status}`, 
    { requestId, status, salesId: user.id }
  )

  revalidatePath('/sales')
  revalidatePath('/dashboard')
  revalidatePath('/admin')
  return { success: true }
}

/**
 * Update request photo path
 */
export async function updatePhotoPathSales(requestId: string, filePath: string) {
  const { user } = await verifySalesOrAdmin()

  const { createClient: createServiceClient } = await import('@supabase/supabase-js')
  const supabaseService = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error: updateError } = await supabaseService
    .from('oil_lab_requests')
    .update({ sample_photo_path: filePath })
    .eq('id', requestId)

  if (updateError) {
    throw new Error(updateError.message)
  }

  await createAuditLog(
    'SALES_UPLOAD_PHOTO',
    `Sales uploaded bottle photo for lab request ID: ${requestId}`,
    { requestId, filePath, salesId: user.id }
  )

  revalidatePath('/sales')
  revalidatePath('/dashboard')
  revalidatePath('/admin')
  return { success: true }
}
