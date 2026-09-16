import webPush from 'web-push'
import { createServiceClient } from '@/lib/supabase/service'

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:warehouse@nabelsakha.com'

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
  } catch (err) {
    console.error('[WebPush] Error setting VAPID details:', err)
  }
}

export interface PushNotificationPayload {
  title: string
  body: string
  url?: string
}

/**
 * Send a web push notification to all active devices registered by a specific user.
 */
export async function sendPushNotificationToUser(
  userId: string,
  payload: PushNotificationPayload
) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('[WebPush] VAPID keys not configured. Skipping push.')
    return { success: false, error: 'VAPID keys not configured' }
  }

  const supabase = createServiceClient()
  const { data: subscriptions, error } = await supabase
    .from('oil_push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (error || !subscriptions || subscriptions.length === 0) {
    return { success: false, error: 'No push subscriptions found for this user' }
  }

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      }

      try {
        await webPush.sendNotification(
          pushSubscription,
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: payload.url || '/',
          })
        )
        return { success: true, endpoint: sub.endpoint }
      } catch (err: unknown) {
        // If subscription is expired or unregistered on push service (HTTP 404 or 410 Gone)
        const statusCode = (err as { statusCode?: number })?.statusCode
        if (statusCode === 404 || statusCode === 410) {
          console.log('[WebPush] Deleting expired push subscription:', sub.id)
          await supabase.from('oil_push_subscriptions').delete().eq('id', sub.id)
        }
        throw err
      }
    })
  )

  const sentCount = results.filter((r) => r.status === 'fulfilled').length
  return { success: sentCount > 0, total: subscriptions.length, sentCount, results }
}
