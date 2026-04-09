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

export function pruneRateLimitStore(maxSize = 5000) {
  if (store.size <= maxSize) return

  const currentTime = nowMs()
  for (const [key, value] of store.entries()) {
    if (currentTime >= value.resetAt) {
      store.delete(key)
    }
  }
}
