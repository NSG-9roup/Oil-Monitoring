import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimitDistributed, getClientIp, pruneRateLimitStore } from '@/lib/rate-limit'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

const requestSchema = z
  .object({
    customerId: z.string().uuid(),
    pin: z
      .string()
      .trim()
      .min(6, 'PIN must be at least 6 characters')
      .max(32, 'PIN is too long'),
  })
  .strict()

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

async function requireAdmin(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // Read-only access for route handler.
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: jsonError('Unauthorized', 401) }
  }

  const { data: profile, error } = await supabase
    .from('oil_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || !profile || profile.role !== 'admin') {
    return { error: jsonError('Forbidden', 403) }
  }

  return { user }
}

export async function POST(request: NextRequest) {
  try {
    pruneRateLimitStore()

    const ip = getClientIp(request.headers)
    const rate = await checkRateLimitDistributed(`admin-customer-pin:${ip}`, 20, 60_000)
    if (!rate.allowed) {
      const response = jsonError('Too many requests. Please try again later.', 429)
      response.headers.set('Retry-After', String(rate.retryAfterSeconds))
      response.headers.set('X-RateLimit-Remaining', '0')
      return response
    }

    const contentLength = Number(request.headers.get('content-length') || '0')
    if (contentLength > 5_000) {
      return jsonError('Payload too large', 413)
    }

    const authResult = await requireAdmin(request)
    if ('error' in authResult) {
      return authResult.error
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return jsonError('Invalid JSON payload', 400)
    }

    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || 'Invalid request payload', 400)
    }

    const { customerId, pin } = parsed.data

    const { data, error } = await supabaseAdmin.rpc('set_customer_user_management_pin', {
      p_customer_id: customerId,
      p_pin: pin,
    })

    if (error) {
      if (error.message.toLowerCase().includes('customer not found')) {
        return jsonError('Customer not found', 404)
      }
      if (error.message.toLowerCase().includes('at least 4 characters')) {
        return jsonError('PIN must be at least 4 characters', 400)
      }
      throw error
    }

    if (!data) {
      return jsonError('Failed to update PIN', 500)
    }

    const response = NextResponse.json({ success: true })
    response.headers.set('X-RateLimit-Remaining', String(rate.remaining))
    return response
  } catch (error: unknown) {
    console.error('Set customer PIN error:', error)
    return jsonError('An unexpected error occurred', 500)
  }
}
