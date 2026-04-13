import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit, getClientIp, pruneRateLimitStore } from '@/lib/rate-limit'

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

const createUserSchema = z.object({
  action: z.literal('create'),
  full_name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone_number: z.union([z.string().trim().min(8).max(20), z.null(), z.undefined()]).optional(),
  password: z
    .string()
    .min(12, 'Password must be at least 12 characters')
    .max(72, 'Password is too long')
    .regex(/[A-Z]/, 'Password must include an uppercase letter')
    .regex(/[a-z]/, 'Password must include a lowercase letter')
    .regex(/[0-9]/, 'Password must include a number'),
}).strict()

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

async function getCustomerProfile(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // Route handler only needs read access.
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
    .select('id, role, customer_id')
    .eq('id', user.id)
    .single()

  if (error || !profile || profile.role !== 'customer' || !profile.customer_id) {
    return { error: jsonError('Forbidden', 403) }
  }

  return { user, profile }
}

export async function POST(request: NextRequest) {
  try {
    pruneRateLimitStore()

    const ip = getClientIp(request.headers)
    const rate = checkRateLimit(`customer-users:${ip}`, 20, 60_000)
    if (!rate.allowed) {
      const response = jsonError('Too many requests. Please try again later.', 429)
      response.headers.set('Retry-After', String(rate.retryAfterSeconds))
      response.headers.set('X-RateLimit-Remaining', '0')
      return response
    }

    const authResult = await getCustomerProfile(request)
    if ('error' in authResult) {
      return authResult.error
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return jsonError('Invalid JSON payload', 400)
    }

    const parsed = createUserSchema.safeParse(body)
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || 'Invalid request payload', 400)
    }

    const email = parsed.data.email.toLowerCase()
    const fullName = parsed.data.full_name.trim()
    const phoneNumber = typeof parsed.data.phone_number === 'string'
      ? parsed.data.phone_number.trim()
      : null

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: parsed.data.password,
      email_confirm: true,
    })

    if (authError) throw authError

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('oil_profiles')
      .insert([
        {
          id: authData.user.id,
          full_name: fullName,
          email,
          phone_number: phoneNumber,
          role: 'customer',
          customer_id: authResult.profile.customer_id,
        },
      ])
      .select('id, full_name, email, phone_number, created_at')
      .single()

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw profileError
    }

    const response = NextResponse.json({ success: true, profile: profileData })
    response.headers.set('X-RateLimit-Remaining', String(rate.remaining))
    return response
  } catch (error: unknown) {
    console.error('Customer user management error:', error)
    return jsonError('An unexpected error occurred', 500)
  }
}
