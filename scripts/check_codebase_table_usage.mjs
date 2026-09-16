import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

function getFiles(dir, files = []) {
  for (const f of readdirSync(dir)) {
    const full = join(dir, f)
    if (f === 'node_modules' || f === '.next' || f === '.git') continue
    if (statSync(full).isDirectory()) {
      getFiles(full, files)
    } else if (/\.(tsx|ts|jsx|js)$/.test(f)) {
      files.push(full)
    }
  }
  return files
}

const allFiles = getFiles('./app').concat(getFiles('./lib'))

const tablesToCheck = [
  'oil_customers',
  'oil_profiles',
  'oil_machines',
  'oil_products',
  'oil_lab_requests',
  'oil_lab_tests',
  'oil_orders',
  'oil_complaints',
  'oil_audit_logs',
  'oil_push_subscriptions',
  'oil_email_logs',
  'oil_activity_logs',
  'oil_notifications',
  'oil_samples',
  'oil_quotations',
  'oil_customer_users',
  'oil_machine_types',
  'oil_rate_limits',
  'oil_settings',
  'oil_logs',
  'oil_comments',
  'profiles',
  'customers',
  'machines',
  'products',
  'lab_tests',
  'orders',
  'complaints'
]

console.log('=== USAGE OF TABLES IN APPLICATION CODE (app/ & lib/) ===\n')

const results = {}

for (const t of tablesToCheck) {
  let count = 0
  const matches = []
  for (const file of allFiles) {
    const content = readFileSync(file, 'utf-8')
    const regex = new RegExp(`['"\`]${t}['"\`]|from\\(['"\`]${t}['"\`]\\)`, 'g')
    const m = content.match(regex)
    if (m) {
      count += m.length
      matches.push(file)
    }
  }
  results[t] = { count, files: matches }
  const status = count > 0 ? `✅ USED (${count} references in ${matches.length} files)` : '❌ UNUSED / DEAD TABLE'
  console.log(`${t.padEnd(25)} : ${status}`)
}
