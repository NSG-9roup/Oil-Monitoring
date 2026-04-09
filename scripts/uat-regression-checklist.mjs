#!/usr/bin/env node

const baseUrl = process.env.UAT_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:3000'
const timeoutMs = Number(process.env.UAT_TIMEOUT_MS || 10000)

const results = []

function pushResult(name, pass, details) {
  results.push({ name, pass, details })
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    return response
  } finally {
    clearTimeout(timer)
  }
}

async function checkServerReachable() {
  try {
    const res = await fetchWithTimeout(`${baseUrl}/login`, { redirect: 'manual' })
    pushResult('Server reachable', true, `Connected to ${baseUrl} (status ${res.status})`)
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    pushResult('Server reachable', false, `Cannot reach ${baseUrl}: ${message}`)
    return false
  }
}

async function checkRouteStatus(path, expectedStatuses) {
  const url = `${baseUrl}${path}`
  try {
    const res = await fetchWithTimeout(url, { redirect: 'manual' })
    const pass = expectedStatuses.includes(res.status)
    pushResult(
      `Route ${path}`,
      pass,
      `status=${res.status}, expected one of [${expectedStatuses.join(', ')}]`
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    pushResult(`Route ${path}`, false, `request failed: ${message}`)
  }
}

async function checkAuthRedirect(path) {
  const url = `${baseUrl}${path}`
  try {
    const res = await fetchWithTimeout(url, { redirect: 'manual' })
    const location = res.headers.get('location') || ''
    const pass = (res.status === 302 || res.status === 303 || res.status === 307 || res.status === 308) && location.includes('/login')
    pushResult(
      `Auth redirect ${path}`,
      pass,
      `status=${res.status}, location=${location || '-'} (expect redirect to /login)`
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    pushResult(`Auth redirect ${path}`, false, `request failed: ${message}`)
  }
}

async function checkApiUnauthorized() {
  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', userId: '00000000-0000-0000-0000-000000000000' }),
      redirect: 'manual',
    })

    pushResult(
      'API unauthorized guard',
      res.status === 401,
      `status=${res.status}, expected 401`
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    pushResult('API unauthorized guard', false, `request failed: ${message}`)
  }
}

async function checkApiPayloadLimit() {
  try {
    const hugeText = 'A'.repeat(220_000)
    const res = await fetchWithTimeout(`${baseUrl}/api/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        email: 'oversize-test@example.com',
        password: 'password123',
        full_name: hugeText,
        role: 'customer',
      }),
      redirect: 'manual',
    })

    pushResult(
      'API payload size guard',
      res.status === 413,
      `status=${res.status}, expected 413`
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    pushResult('API payload size guard', false, `request failed: ${message}`)
  }
}

async function checkApiRateLimit() {
  const statuses = []

  try {
    for (let i = 0; i < 35; i += 1) {
      const res = await fetchWithTimeout(`${baseUrl}/api/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', userId: '00000000-0000-0000-0000-000000000000' }),
        redirect: 'manual',
      })
      statuses.push(res.status)
    }

    const has401 = statuses.includes(401)
    const has429 = statuses.includes(429)
    pushResult(
      'API rate limit guard',
      has401 && has429,
      `statuses observed: ${JSON.stringify(statuses.slice(0, 10))}... (expect mix of 401 then 429)`
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    pushResult('API rate limit guard', false, `request failed: ${message}`)
  }
}

function printSummary() {
  const passCount = results.filter((r) => r.pass).length
  const failCount = results.length - passCount

  console.log('\n=== UAT Regression Checklist (Semi-Automated) ===')
  console.log(`Base URL: ${baseUrl}`)
  console.log(`Checks: ${results.length}, Pass: ${passCount}, Fail: ${failCount}`)
  console.log('')

  for (const result of results) {
    const status = result.pass ? '[PASS]' : '[FAIL]'
    console.log(`${status} ${result.name}`)
    console.log(`       ${result.details}`)
  }

  console.log('')
  if (failCount > 0) {
    console.log('UAT regression script finished with failures.')
    process.exitCode = 1
  } else {
    console.log('UAT regression script finished successfully.')
  }
}

async function main() {
  const reachable = await checkServerReachable()
  if (!reachable) {
    printSummary()
    return
  }

  await checkRouteStatus('/login', [200])
  await checkRouteStatus('/api/admin/users', [405, 401, 429])

  await checkAuthRedirect('/dashboard')
  await checkAuthRedirect('/admin')

  await checkApiUnauthorized()
  await checkApiPayloadLimit()
  await checkApiRateLimit()

  printSummary()
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error('Unexpected UAT script error:', message)
  process.exitCode = 1
})
