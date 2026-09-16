'use server'

import { createClient } from '@/lib/supabase/server'
import { sendPushNotificationToUser } from '@/lib/push/pushService'

/**
 * Server action to send a real Web Push test from backend to current user's registered device.
 */
export async function sendTestPushNotificationAction() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Unauthorized: Harap login terlebih dahulu' }
    }

    const result = await sendPushNotificationToUser(user.id, {
      title: 'OilTrack System • Push Notification',
      body: 'Notifikasi Web Push dari server berhasil terkirim ke perangkat Anda!',
      url: '/dashboard/profile'
    })

    if (!result.success) {
      return { success: false, error: result.error || 'Perangkat belum terdaftar di push subscription' }
    }

    return { success: true, sentCount: result.sentCount }
  } catch (err: unknown) {
    console.error('Error in sendTestPushNotificationAction:', err)
    const errorMsg = err instanceof Error ? err.message : 'Gagal mengirim push notification'
    return { success: false, error: errorMsg }
  }
}
