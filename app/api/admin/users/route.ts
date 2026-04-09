import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit, getClientIp, pruneRateLimitStore } from '@/lib/rate-limit'

// Create Supabase Admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

const panelRoles = ['admin', 'sales'] as const
const assignableRoles = ['customer', 'admin', 'sales'] as const
const actionSchema = z.enum(['create', 'update', 'delete'])

const contactEmailSchema = z.union([z.string().trim().email().max(254), z.null(), z.undefined()])
const phoneSchema = z.union([
  z.string().trim().min(8).max(20).regex(/^[0-9+()\-\s]+$/, 'Invalid phone number format'),
  z.null(),
  z.undefined(),
])

const createUserSchema = z
  .object({
    action: z.literal('create'),
    email: z.string().trim().email().max(254),
    password: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .max(72, 'Password is too long')
      .regex(/[A-Z]/, 'Password must include an uppercase letter')
      .regex(/[a-z]/, 'Password must include a lowercase letter')
      .regex(/[0-9]/, 'Password must include a number'),
    full_name: z.string().trim().min(2).max(100),
    contact_email: contactEmailSchema,
    phone_number: phoneSchema,
    role: z.enum(assignableRoles),
    customer_id: z.union([z.string().uuid(), z.null(), z.undefined()]),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.role === 'customer' && !value.customer_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customer_id'],
        message: 'customer_id is required for customer users',
      })
    }
  })

const updateUserSchema = z
  .object({
    action: z.literal('update'),
    userId: z.string().uuid(),
    full_name: z.string().trim().min(2).max(100),
    contact_email: contactEmailSchema,
    phone_number: phoneSchema,
    role: z.enum(assignableRoles),
    customer_id: z.union([z.string().uuid(), z.null(), z.undefined()]),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.role === 'customer' && !value.customer_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customer_id'],
        message: 'customer_id is required for customer users',
      })
    }
  })

const deleteUserSchema = z
  .object({
    action: z.literal('delete'),
    userId: z.string().uuid(),
  })
  .strict()

type PanelRole = (typeof panelRoles)[number]

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

async function getAdminProfile(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // Route handlers only need read access here.
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

  const role = profile?.role as PanelRole | undefined
  if (error || !role || !panelRoles.includes(role)) {
    return { error: jsonError('Forbidden', 403) }
  }

  return { user, profile: { role } }
}

export async function POST(request: NextRequest) {
  try {
    pruneRateLimitStore()

    const ip = getClientIp(request.headers)
    const rate = checkRateLimit(`admin-users:${ip}`, 30, 60_000)
    if (!rate.allowed) {
      const response = jsonError('Too many requests. Please try again later.', 429)
      response.headers.set('Retry-After', String(rate.retryAfterSeconds))
      response.headers.set('X-RateLimit-Remaining', '0')
      return response
    }

    const contentLength = Number(request.headers.get('content-length') || '0')
    if (contentLength > 20_000) {
      return jsonError('Payload too large', 413)
    }

    const authResult = await getAdminProfile(request)
    if ('error' in authResult) {
      return authResult.error
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return jsonError('Invalid JSON payload', 400)
    }

    const actionResult = z.object({ action: actionSchema }).passthrough().safeParse(body)
    if (!actionResult.success) {
      return jsonError('Invalid action', 400)
    }

    const action = actionResult.data.action

    if (action === 'create') {
      const parsed = createUserSchema.safeParse(body)
      if (!parsed.success) {
        return jsonError(parsed.error.issues[0]?.message || 'Invalid request payload', 400)
      }

      if (authResult.profile.role === 'sales' && parsed.data.role !== 'customer') {
        return jsonError('Sales can only create customer users', 403)
      }

      const email = parsed.data.email.toLowerCase()
      const fullName = parsed.data.full_name.trim()
      const contactEmail = typeof parsed.data.contact_email === 'string'
        ? parsed.data.contact_email.toLowerCase()
        : null
      const phoneNumber = typeof parsed.data.phone_number === 'string'
        ? parsed.data.phone_number.trim()
        : null
      const customerId = parsed.data.role === 'customer' ? parsed.data.customer_id! : null

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: parsed.data.password,
        email_confirm: true,
      })

      if (authError) throw authError

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('oil_profiles')
        .insert([{
          id: authData.user.id,
          full_name: fullName,
          email: contactEmail,
          phone_number: phoneNumber,
          role: parsed.data.role,
          customer_id: customerId,
        }])

      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        throw profileError
      }

      const response = NextResponse.json({ success: true, user: authData.user })
      response.headers.set('X-RateLimit-Remaining', String(rate.remaining))
      return response
    } else if (action === 'delete') {
      const parsed = deleteUserSchema.safeParse(body)
      if (!parsed.success) {
        return jsonError(parsed.error.issues[0]?.message || 'Invalid request payload', 400)
      }

      if (parsed.data.userId === authResult.user.id) {
        return jsonError('You cannot delete your own account', 400)
      }

      const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
        .from('oil_profiles')
        .select('role')
        .eq('id', parsed.data.userId)
        .single()

      if (targetProfileError || !targetProfile) {
        return jsonError('User profile not found', 404)
      }

      if (authResult.profile.role === 'sales') {
        if (targetProfile.role !== 'customer') {
          return jsonError('Sales can only delete customer users', 403)
        }
      }

      // Delete user from Supabase Auth
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(parsed.data.userId)
      if (authError) throw authError

      const response = NextResponse.json({ success: true })
      response.headers.set('X-RateLimit-Remaining', String(rate.remaining))
      return response
    } else if (action === 'update') {
      const parsed = updateUserSchema.safeParse(body)
      if (!parsed.success) {
        return jsonError(parsed.error.issues[0]?.message || 'Invalid request payload', 400)
      }

      if (authResult.profile.role === 'sales' && parsed.data.role !== 'customer') {
        return jsonError('Sales can only update customer users', 403)
      }

      const contactEmail = typeof parsed.data.contact_email === 'string'
        ? parsed.data.contact_email.toLowerCase()
        : null
      const phoneNumber = typeof parsed.data.phone_number === 'string'
        ? parsed.data.phone_number.trim()
        : null
      const customerId = parsed.data.role === 'customer' ? parsed.data.customer_id! : null

      // Update profile only (can't update auth email easily)
      const { error } = await supabaseAdmin
        .from('oil_profiles')
        .update({
          full_name: parsed.data.full_name.trim(),
          email: contactEmail,
          phone_number: phoneNumber,
          role: parsed.data.role,
          customer_id: customerId,
        })
        .eq('id', parsed.data.userId)

      if (error) throw error

      const response = NextResponse.json({ success: true })
      response.headers.set('X-RateLimit-Remaining', String(rate.remaining))
      return response
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: unknown) {
    console.error('User management error:', error)
    return jsonError('An unexpected error occurred', 500)
  }
}
