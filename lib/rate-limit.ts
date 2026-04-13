import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type RateLimitEntry = {
  count: number
  resetAt: number
}

type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

const store = new Map<string, RateLimitEntry>()

let supabaseAdminClient: SupabaseClient | null = null

function getSupabaseAdminClient() {
  if (supabaseAdminClient) return supabaseAdminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null

  supabaseAdminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return supabaseAdminClient
}

function nowMs() {
  return Date.now()
}

export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || 'unknown'
  }

  const realIp = headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }

  return 'unknown'
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const currentTime = nowMs()
  const existing = store.get(key)

  if (!existing || currentTime >= existing.resetAt) {
    store.set(key, { count: 1, resetAt: currentTime + windowMs })
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    }
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - currentTime) / 1000)),
    }
  }

  existing.count += 1
  store.set(key, existing)

  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - currentTime) / 1000)),
  }
}

export async function checkRateLimitDistributed(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const admin = getSupabaseAdminClient()
  if (!admin) {
    return checkRateLimit(key, limit, windowMs)
  }

  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000))
  const { data, error } = await admin.rpc('check_oil_rate_limit', {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })

  if (error || !Array.isArray(data) || !data[0]) {
    return checkRateLimit(key, limit, windowMs)
  }

  const row = data[0] as {
    allowed: boolean
    remaining: number
    retry_after_seconds: number
  }

  return {
    allowed: Boolean(row.allowed),
    remaining: Math.max(0, Number(row.remaining) || 0),
    retryAfterSeconds: Math.max(1, Number(row.retry_after_seconds) || 1),
  }
}

export function pruneRateLimitStore(maxSize = 5000) {
  if (store.size <= maxSize) return

  const currentTime = nowMs()
  for (const [key, value] of store.entries()) {
    if (currentTime >= value.resetAt) {
      store.delete(key)
    }
  }
}
