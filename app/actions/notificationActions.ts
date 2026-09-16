'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export interface InAppNotification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'critical'
  link_url?: string
  is_read: boolean
  created_at: string
}

/**
 * Fetch in-app notifications for the authenticated user.
 * Tries `oil_notifications` first; if not yet migrated in Supabase, falls back to relevant audit/alert logs.
 */
export async function getInAppNotificationsAction(): Promise<{
  success: boolean
  notifications: InAppNotification[]
  unreadCount: number
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, notifications: [], unreadCount: 0 }
    }

    const serviceDb = createServiceClient()

    // 1. Try querying oil_notifications
    const { data: directNotifs, error: notifErr } = await serviceDb
      .from('oil_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!notifErr && directNotifs) {
      const unreadCount = directNotifs.filter((n) => !n.is_read).length
      return {
        success: true,
        notifications: directNotifs,
        unreadCount,
      }
    }

    // 2. Fallback: Generate contextual notifications from recent system activities
    // Query recent audit logs or alert actions relevant to user
    const { data: auditLogs } = await serviceDb
      .from('oil_audit_logs')
      .select('id, action, details, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    const fallbackNotifs: InAppNotification[] = (auditLogs || []).map((log) => {
      let title = 'Aktivitas Sistem'
      let type: InAppNotification['type'] = 'info'
      let link_url = '/dashboard'

      if (log.action.includes('LAB_TEST')) {
        title = 'Hasil Uji Lab Terbit'
        type = 'success'
        link_url = '/dashboard'
      } else if (log.action.includes('ORDER')) {
        title = 'Update Permintaan Penawaran'
        type = 'info'
        link_url = '/dashboard'
      } else if (log.action.includes('COMPLAINT')) {
        title = 'Update Komplain Layanan'
        type = 'warning'
        link_url = '/dashboard'
      }

      return {
        id: log.id,
        title,
        message: log.details || 'Pembaruan data pada sistem OilTrack.',
        type,
        link_url,
        is_read: false,
        created_at: log.created_at,
      }
    })

    return {
      success: true,
      notifications: fallbackNotifs,
      unreadCount: fallbackNotifs.length,
    }
  } catch (err) {
    console.error('Error fetching in-app notifications:', err)
    return { success: false, notifications: [], unreadCount: 0 }
  }
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationAsReadAction(notificationId: string) {
  try {
    const serviceDb = createServiceClient()
    await serviceDb
      .from('oil_notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    return { success: true }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: errorMsg }
  }
}

/**
 * Mark all notifications as read for current user.
 */
export async function markAllNotificationsAsReadAction() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false }

    const serviceDb = createServiceClient()
    await serviceDb
      .from('oil_notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)

    return { success: true }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: errorMsg }
  }
}
