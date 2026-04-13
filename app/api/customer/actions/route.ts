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

const createActionSchema = z.object({
  action: z.literal('create'),
  machine_id: z.string().uuid(),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(2000).optional().nullable(),
  priority: z.enum(['low', 'medium', 'high']),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  alert_key: z.string().trim().max(240).optional().nullable(),
  owner_profile_id: z.string().uuid().optional().nullable(),
  source_payload: z.record(z.string(), z.any()).optional(),
})

const updateActionSchema = z.object({
  action: z.literal('update'),
  action_id: z.string().uuid(),
  status: z.enum(['open', 'assigned', 'in_progress', 'completed', 'verified', 'overdue']).optional(),
  verification_status: z.enum(['pending', 'passed', 'failed']).optional(),
  owner_profile_id: z.string().uuid().nullable().optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  evidence_notes: z.string().trim().max(2000).nullable().optional(),
})

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

async function getCustomerContext(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // read-only access for auth lookup
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

async function loadAction(actionId: string) {
  const { data, error } = await supabaseAdmin
    .from('oil_maintenance_actions')
    .select(`
      *,
      machine:oil_machines(machine_name, location),
      owner:oil_profiles!oil_maintenance_actions_owner_profile_id_fkey(full_name, email)
    `)
    .eq('id', actionId)
    .single()

  if (error) throw error
  return data
}

async function appendLog(params: {
  actionId: string
  actorId: string
  eventType: 'created' | 'updated' | 'status_changed' | 'assigned' | 'completed' | 'verified' | 'reopened'
  fromStatus?: string | null
  toStatus?: string | null
  metadata?: Record<string, unknown>
}) {
  const { error } = await supabaseAdmin.from('oil_maintenance_action_logs').insert({
    action_id: params.actionId,
    actor_id: params.actorId,
    event_type: params.eventType,
    from_status: params.fromStatus || null,
    to_status: params.toStatus || null,
    metadata: params.metadata || {},
  })

  if (error) throw error
}

export async function GET(request: NextRequest) {
  try {
    const context = await getCustomerContext(request)
    if ('error' in context) return context.error

    const { data, error } = await supabaseAdmin
      .from('oil_maintenance_actions')
      .select(`
        *,
        machine:oil_machines(machine_name, location),
        owner:oil_profiles!oil_maintenance_actions_owner_profile_id_fkey(full_name, email)
      `)
      .eq('customer_id', context.profile.customer_id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ actions: data || [] })
  } catch (error: unknown) {
    console.error('Customer actions GET error:', error)
    return jsonError('An unexpected error occurred', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    pruneRateLimitStore()

    const ip = getClientIp(request.headers)
    const rate = await checkRateLimitDistributed(`customer-actions:${ip}`, 30, 60_000)
    if (!rate.allowed) {
      const response = jsonError('Too many requests. Please try again later.', 429)
      response.headers.set('Retry-After', String(rate.retryAfterSeconds))
      response.headers.set('X-RateLimit-Remaining', '0')
      return response
    }

    const context = await getCustomerContext(request)
    if ('error' in context) return context.error

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return jsonError('Invalid JSON payload', 400)
    }

    const parsed = createActionSchema.safeParse(body)
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || 'Invalid request payload', 400)
    }

    const { data: created, error } = await supabaseAdmin
      .from('oil_maintenance_actions')
      .insert({
        customer_id: context.profile.customer_id,
        machine_id: parsed.data.machine_id,
        alert_key: parsed.data.alert_key || null,
        title: parsed.data.title,
        description: parsed.data.description || null,
        priority: parsed.data.priority,
        status: parsed.data.owner_profile_id ? 'assigned' : 'open',
        owner_profile_id: parsed.data.owner_profile_id || null,
        due_date: parsed.data.due_date || null,
        source_payload: parsed.data.source_payload || {},
        created_by: context.user.id,
        updated_by: context.user.id,
      })
      .select(`
        *,
        machine:oil_machines(machine_name, location),
        owner:oil_profiles!oil_maintenance_actions_owner_profile_id_fkey(full_name, email)
      `)
      .single()

    if (error) throw error

    await appendLog({
      actionId: created.id,
      actorId: context.user.id,
      eventType: 'created',
      toStatus: created.status,
      metadata: {
        title: created.title,
        priority: created.priority,
      },
    })

    const response = NextResponse.json({ action: created })
    response.headers.set('X-RateLimit-Remaining', String(rate.remaining))
    return response
  } catch (error: unknown) {
    console.error('Customer actions POST error:', error)
    return jsonError('An unexpected error occurred', 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    pruneRateLimitStore()

    const ip = getClientIp(request.headers)
    const rate = await checkRateLimitDistributed(`customer-actions:${ip}`, 40, 60_000)
    if (!rate.allowed) {
      const response = jsonError('Too many requests. Please try again later.', 429)
      response.headers.set('Retry-After', String(rate.retryAfterSeconds))
      response.headers.set('X-RateLimit-Remaining', '0')
      return response
    }

    const context = await getCustomerContext(request)
    if ('error' in context) return context.error

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return jsonError('Invalid JSON payload', 400)
    }

    const parsed = updateActionSchema.safeParse(body)
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message || 'Invalid request payload', 400)
    }

    const { data: existing, error: loadError } = await supabaseAdmin
      .from('oil_maintenance_actions')
      .select('id, status, owner_profile_id, verification_status, customer_id')
      .eq('id', parsed.data.action_id)
      .single()

    if (loadError || !existing || existing.customer_id !== context.profile.customer_id) {
      return jsonError('Action not found', 404)
    }

    const patch: Record<string, unknown> = {
      updated_by: context.user.id,
    }

    let eventType: 'updated' | 'status_changed' | 'assigned' | 'completed' | 'verified' | 'reopened' = 'updated'
    const fromStatus = existing.status
    if (parsed.data.status) {
      patch.status = parsed.data.status
      eventType = parsed.data.status === 'completed'
        ? 'completed'
        : parsed.data.status === 'verified'
        ? 'verified'
        : parsed.data.status === 'open' && existing.status !== 'open'
        ? 'reopened'
        : 'status_changed'

      if (parsed.data.status === 'completed') {
        patch.completed_at = new Date().toISOString()
        patch.completed_by = context.user.id
      }
      if (parsed.data.status === 'verified') {
        if (existing.status === 'completed') {
          patch.completed_at = new Date().toISOString()
        }
      }
    }

    if (parsed.data.owner_profile_id !== undefined) {
      patch.owner_profile_id = parsed.data.owner_profile_id
      if (parsed.data.owner_profile_id) {
        patch.status = patch.status || 'assigned'
        eventType = 'assigned'
      }
    }

    if (parsed.data.verification_status) {
      patch.verification_status = parsed.data.verification_status
      if (parsed.data.verification_status === 'passed') {
        eventType = 'verified'
      } else if (parsed.data.verification_status === 'failed') {
        if (!parsed.data.status) {
          patch.status = 'open'
        }
        eventType = 'reopened'
      }
    }

    if (patch.status === 'open') {
      patch.completed_at = null
      patch.completed_by = null
    }

    if (parsed.data.due_date !== undefined) patch.due_date = parsed.data.due_date
    if (parsed.data.evidence_notes !== undefined) patch.evidence_notes = parsed.data.evidence_notes

    const { error: updateError } = await supabaseAdmin
      .from('oil_maintenance_actions')
      .update(patch)
      .eq('id', parsed.data.action_id)

    if (updateError) throw updateError

    await appendLog({
      actionId: parsed.data.action_id,
      actorId: context.user.id,
      eventType,
      fromStatus,
      toStatus: String(parsed.data.status || existing.status),
      metadata: {
        owner_profile_id: parsed.data.owner_profile_id,
        verification_status: parsed.data.verification_status,
        due_date: parsed.data.due_date,
      },
    })

    const updated = await loadAction(parsed.data.action_id)
    const response = NextResponse.json({ action: updated })
    response.headers.set('X-RateLimit-Remaining', String(rate.remaining))
    return response
  } catch (error: unknown) {
    console.error('Customer actions PATCH error:', error)
    return jsonError('An unexpected error occurred', 500)
  }
}
