#!/usr/bin/env node

const baseUrl = process.env.UAT_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:3000'
const timeoutMs = Number(process.env.UAT_TIMEOUT_MS || 10000)

const results = []

function pushResult(name, pass, details) {
  results.push({ name, pass, details })
}

const clientIp = `127.0.0.${Math.floor(Math.random() * 254) + 1}`

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const headers = {
    ...init.headers,
    'X-Forwarded-For': clientIp
  }
  try {
    const response = await fetch(url, { ...init, headers, signal: controller.signal })
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

  await checkAuthRedirect('/dashboard')
  await checkAuthRedirect('/admin')

  printSummary()
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error('Unexpected UAT script error:', message)
  process.exitCode = 1
})
