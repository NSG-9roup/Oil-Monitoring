import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const secret = url.searchParams.get('secret')
    
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
    if (webhookSecret && secret !== webhookSecret) {
      return NextResponse.json({ error: 'Unauthorized secret' }, { status: 401 })
    }

    const payload = await request.json()
    const { type, data } = payload

    if (!data || !data.email_id) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const resendId = data.email_id
    const recipient = Array.isArray(data.to) ? data.to.join(', ') : (data.to || 'unknown')
    const subject = data.subject || 'No Subject'
    
    let status = 'sent'
    if (type === 'email.delivered') status = 'delivered'
    else if (type === 'email.opened' || type === 'email.clicked') status = 'opened'
    else if (type === 'email.bounced') status = 'bounced'
    else if (type === 'email.failed') status = 'failed'

    const supabaseService = createServiceClient()

    const { error } = await supabaseService
      .from('oil_email_logs')
      .upsert(
        {
          resend_id: resendId,
          recipient_email: recipient,
          subject: subject,
          status: status,
          metadata: payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'resend_id' }
      )

    if (error) {
      console.error('[Resend Webhook] Database upsert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Resend Webhook] Error processing event:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
