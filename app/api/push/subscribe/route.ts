import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subscription } = body

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 })
    }

    // Console log the subscription details for tracking
    console.log('[Push Notification Service] Registered new subscription endpoint:', subscription.endpoint)

    return NextResponse.json({ success: true, message: 'Subscription registered successfully' })
  } catch (error: unknown) {
    console.error('Push notification registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
