'use server'

import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from './adminActions'
import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { sendPurchasingProposalEmail } from './emailActions'

async function verifySalesOrAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
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
  try {
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
      return { success: false, error: updateError.message }
    }

    await createAuditLog(
      'SALES_UPDATE_REQUEST_STATUS', 
      `Sales updated lab request ID: ${requestId} status to: ${status}`, 
      { requestId, status, salesId: user.id }
    )

    // Notify customer profiles of the status change
    try {
      const { data: request } = await supabaseService
        .from('oil_lab_requests')
        .select('id, title, customer_id, machine:oil_machines(machine_name)')
        .eq('id', requestId)
        .single()

      if (request?.customer_id) {
        const { data: customerProfiles } = await supabaseService
          .from('oil_profiles')
          .select('id')
          .eq('customer_id', request.customer_id)

        if (customerProfiles && customerProfiles.length > 0) {
          const { createInAppNotification } = await import('@/app/actions/notificationActions')
          const { sendPushNotificationToUser } = await import('@/lib/push/pushService')

          const statusTitle = status === 'sampling'
            ? 'Pengambilan Sampel Sedang Berjalan'
            : status === 'completed'
            ? 'Permintaan Uji Lab Selesai'
            : 'Update Status Permintaan Lab'

          const statusMsg = status === 'sampling'
            ? `Tim teknis sedang menjadwalkan/mengambil sampel oli untuk "${request.title}".`
            : status === 'completed'
            ? `Proses pengujian sampel untuk "${request.title}" telah rampung.`
            : `Status permintaan "${request.title}" telah diperbarui.`

          for (const p of customerProfiles) {
            await createInAppNotification({
              userId: p.id,
              title: statusTitle,
              message: statusMsg,
              type: status === 'completed' ? 'success' : 'info',
              linkUrl: '/dashboard',
            })
            await sendPushNotificationToUser(p.id, {
              title: `${statusTitle} • OilTrack`,
              body: statusMsg,
              url: '/dashboard',
            }).catch(() => null)
          }
        }
      }
    } catch (notifErr) {
      console.warn('[Sales] Failed to dispatch request status notification to customer:', notifErr)
    }

    revalidatePath('/sales')
    return { success: true }
  } catch (err) {
    console.error('Error in updateLabRequestStatusSales:', err)
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Update request photo path
 */
export async function updatePhotoPathSales(requestId: string, filePath: string) {
  try {
    const { user } = await verifySalesOrAdmin()
    const supabaseService = createServiceClient()

    const { error: updateError } = await supabaseService
      .from('oil_lab_requests')
      .update({ sample_photo_path: filePath })
      .eq('id', requestId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    await createAuditLog(
      'SALES_UPLOAD_PHOTO',
      `Sales uploaded bottle photo for lab request ID: ${requestId}`,
      { requestId, filePath, salesId: user.id }
    )

    revalidatePath('/sales')
    return { success: true }
  } catch (err) {
    console.error('Error in updatePhotoPathSales:', err)
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function acceptAndSendProposalSales(orderId: string) {
  try {
    const { user } = await verifySalesOrAdmin()
    const supabaseService = createServiceClient()

    // 1. Fetch order details
    const { data: order, error: orderError } = await supabaseService
      .from('oil_orders')
      .select(`
        *,
        customer:oil_customers(company_name),
        product:oil_products(product_name)
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return { success: false, error: `Order tidak ditemukan: ${orderError?.message || 'ID tidak valid'}` }
    }

    // 2. Update order status to 'processing' FIRST
    const { error: updateError } = await supabaseService
      .from('oil_orders')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) {
      return { success: false, error: `Gagal memperbarui status order: ${updateError.message}` }
    }

    // 3. Try sending purchasing proposal email notification gracefully
    try {
      const { data: profiles } = await supabaseService
        .from('oil_profiles')
        .select('full_name, email, phone_number')
        .eq('customer_id', order.customer_id)
        .eq('role', 'customer')
        .limit(1)

      const customerProfile = profiles?.[0]
      const customerName = customerProfile?.full_name || 'Customer'
      const customerEmail = customerProfile?.email || undefined
      const customerPhone = customerProfile?.phone_number || undefined

      const { data: salesProfile } = await supabaseService
        .from('oil_profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()
      const salesName = salesProfile?.full_name || 'Sales Representative'

      await sendPurchasingProposalEmail({
        salesName,
        customerName,
        companyPT: order.customer?.company_name || 'N/A',
        productName: order.product?.product_name || 'N/A',
        quantity: order.quantity,
        customerPhone,
        customerEmail,
        notes: 'Penawaran dibuat via persetujuan (ACC) Sales di aplikasi.',
      })
    } catch (emailErr) {
      console.error('Non-blocking purchasing email error:', emailErr)
    }

    // 4. Audit logging
    await createAuditLog(
      'SALES_ACC_ORDER',
      `Sales ACC order ID: ${orderId} and sent proposal to purchasing`,
      { orderId, salesId: user.id }
    )

    // 5. Notify customer profiles via In-App Notification and Web Push
    if (order.customer_id) {
      try {
        const { data: custProfiles } = await supabaseService
          .from('oil_profiles')
          .select('id')
          .eq('customer_id', order.customer_id)

        if (custProfiles && custProfiles.length > 0) {
          const { createInAppNotification } = await import('@/app/actions/notificationActions')
          const { sendPushNotificationToUser } = await import('@/lib/push/pushService')

          for (const cp of custProfiles) {
            await createInAppNotification({
              userId: cp.id,
              title: 'Permintaan Penawaran Diteruskan',
              message: `Permintaan penawaran produk ${order.product?.product_name || 'oli'} telah diteruskan oleh sales ke Tim Admin Sales.`,
              type: 'info',
              linkUrl: '/dashboard',
            })
            await sendPushNotificationToUser(cp.id, {
              title: 'Penawaran Diteruskan • OilTrack',
              body: `Permintaan penawaran oli Anda sedang diproses oleh sales.`,
              url: '/dashboard',
            }).catch(() => null)
          }
        }
      } catch (notifErr) {
        console.warn('[Sales] Failed to send customer in-app notification:', notifErr)
      }
    }

    revalidatePath('/sales')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (err) {
    console.error('Error in acceptAndSendProposalSales:', err)
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Update complaint status by sales
 */
export async function updateComplaintStatusSales(complaintId: string, status: 'open' | 'in_progress' | 'resolved') {
  try {
    const { user } = await verifySalesOrAdmin()
    const supabaseService = createServiceClient()

    const { error: updateError } = await supabaseService
      .from('oil_complaints')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', complaintId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    await createAuditLog(
      'SALES_UPDATE_COMPLAINT_STATUS',
      `Sales updated complaint ID: ${complaintId} status to: ${status}`,
      { complaintId, status, salesId: user.id }
    )

    // Notify customer profiles
    try {
      const { data: complaint } = await supabaseService
        .from('oil_complaints')
        .select('id, title, customer_id')
        .eq('id', complaintId)
        .single()

      if (complaint?.customer_id) {
        const { data: custProfiles } = await supabaseService
          .from('oil_profiles')
          .select('id')
          .eq('customer_id', complaint.customer_id)

        if (custProfiles && custProfiles.length > 0) {
          const { createInAppNotification } = await import('@/app/actions/notificationActions')
          const { sendPushNotificationToUser } = await import('@/lib/push/pushService')

          const compTitle = status === 'in_progress' ? 'Komplain Sedang Ditindaklanjuti' : 'Status Komplain Diperbarui'
          const compMsg = `Tiket kendala "${complaint.title || 'Layanan'}" kini berstatus: ${status === 'in_progress' ? 'Sedang Ditindaklanjuti' : status}.`

          for (const cp of custProfiles) {
            await createInAppNotification({
              userId: cp.id,
              title: compTitle,
              message: compMsg,
              type: 'info',
              linkUrl: '/dashboard',
            })
            await sendPushNotificationToUser(cp.id, {
              title: `${compTitle} • OilTrack`,
              body: compMsg,
              url: '/dashboard',
            }).catch(() => null)
          }
        }
      }
    } catch (notifErr) {
      console.warn('[Sales] Failed to notify customer of complaint update:', notifErr)
    }

    revalidatePath('/sales')
    revalidatePath('/dashboard')
    revalidatePath('/admin')
    return { success: true }
  } catch (err) {
    console.error('Error in updateComplaintStatusSales:', err)
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Resolve complaint by sales with resolution notes
 */
export async function resolveComplaintSales(data: {
  complaintId: string
  resolutionNotes: string
}) {
  try {
    const { user } = await verifySalesOrAdmin()
    const supabaseService = createServiceClient()

    const { error: updateError } = await supabaseService
      .from('oil_complaints')
      .update({
        status: 'resolved',
        resolution_notes: data.resolutionNotes?.trim() || null,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', data.complaintId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    await createAuditLog(
      'SALES_RESOLVE_COMPLAINT',
      `Sales resolved complaint ID: ${data.complaintId}`,
      { complaintId: data.complaintId, resolutionNotes: data.resolutionNotes, salesId: user.id }
    )

    // Notify customer profiles that complaint is resolved
    try {
      const { data: complaint } = await supabaseService
        .from('oil_complaints')
        .select('id, title, customer_id')
        .eq('id', data.complaintId)
        .single()

      if (complaint?.customer_id) {
        const { data: custProfiles } = await supabaseService
          .from('oil_profiles')
          .select('id')
          .eq('customer_id', complaint.customer_id)

        if (custProfiles && custProfiles.length > 0) {
          const { createInAppNotification } = await import('@/app/actions/notificationActions')
          const { sendPushNotificationToUser } = await import('@/lib/push/pushService')

          const resolveTitle = 'Komplain Selesai / Teratasi'
          const resolveMsg = `Laporan kendala "${complaint.title || 'Layanan'}" telah diselesaikan oleh tim sales/teknis.`

          for (const cp of custProfiles) {
            await createInAppNotification({
              userId: cp.id,
              title: resolveTitle,
              message: resolveMsg,
              type: 'success',
              linkUrl: '/dashboard',
            })
            await sendPushNotificationToUser(cp.id, {
              title: `${resolveTitle} • OilTrack`,
              body: resolveMsg,
              url: '/dashboard',
            }).catch(() => null)
          }
        }
      }
    } catch (notifErr) {
      console.warn('[Sales] Failed to notify customer of complaint resolution:', notifErr)
    }

    revalidatePath('/sales')
    revalidatePath('/dashboard')
    revalidatePath('/admin')
    return { success: true }
  } catch (err) {
    console.error('Error in resolveComplaintSales:', err)
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

