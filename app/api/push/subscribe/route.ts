import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { subscription } = body

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 })
    }

    // Save to the database
    const { error } = await supabase
      .from('oil_push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh || '',
        auth: subscription.keys?.auth || '',
      }, { onConflict: 'endpoint' })

    if (error) {
      console.error('[Push Service] Database error saving subscription:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[Push Notification Service] Registered subscription persistently for user:', user.email)

    return NextResponse.json({ success: true, message: 'Subscription registered persistently' })
  } catch (error: unknown) {
    console.error('Push notification registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
