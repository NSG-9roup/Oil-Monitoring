'use server'

import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from './adminActions'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { sendPurchasingProposalEmail } from './emailActions'

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

  const supabaseService = createServiceClient()

  const { error: updateError } = await supabaseService
    .from('oil_lab_requests')
    .update({ 
      status,
      assigned_to_profile_id: status === 'sampling' ? user.id : (status === 'pending' ? null : undefined)
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

  const supabaseService = createServiceClient()

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

export async function acceptAndSendProposalSales(orderId: string) {
  const { user } = await verifySalesOrAdmin()

  const supabaseService = createServiceClient()

  // 1. Fetch order details
  const { data: order, error: orderError } = await supabaseService
    .from('oil_orders')
    .select(`
      *,
      customer:oil_customers(company_name, phone_number, email),
      product:oil_products(product_name)
    `)
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    throw new Error('Order not found')
  }

  // 2. Fetch customer contact details from profile
  const { data: profiles } = await supabaseService
    .from('oil_profiles')
    .select('full_name, email, phone_number')
    .eq('customer_id', order.customer_id)
    .eq('role', 'customer')
    .limit(1)

  const customerProfile = profiles?.[0]
  const customerName = customerProfile?.full_name || 'Customer'
  const customerEmail = customerProfile?.email || order.customer?.email || undefined
  const customerPhone = customerProfile?.phone_number || order.customer?.phone_number || undefined

  // 3. Fetch sales name
  const { data: salesProfile } = await supabaseService
    .from('oil_profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()
  const salesName = salesProfile?.full_name || 'Sales Representative'

  // 4. Send purchasing proposal email
  const emailResult = await sendPurchasingProposalEmail({
    salesName,
    customerName,
    companyPT: order.customer?.company_name || 'N/A',
    productName: order.product?.product_name || 'N/A',
    quantity: order.quantity,
    customerPhone,
    customerEmail,
    notes: 'Penawaran dibuat via persetujuan (ACC) Sales di aplikasi.',
  })

  if (!emailResult.success) {
    throw new Error(`Gagal mengirim email penawaran: ${emailResult.error}`)
  }

  // 5. Update order status to 'processing'
  const { error: updateError } = await supabaseService
    .from('oil_orders')
    .update({ 
      status: 'processing',
      updated_by: user.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)

  if (updateError) {
    throw new Error(`Gagal memperbarui status order: ${updateError.message}`)
  }

  // 6. Audit logging
  await createAuditLog(
    'SALES_ACC_ORDER',
    `Sales ACC order ID: ${orderId} and sent proposal to purchasing`,
    { orderId, salesId: user.id }
  )

  revalidatePath('/sales')
  revalidatePath('/dashboard')
  revalidatePath('/admin')

  return { success: true }
}
