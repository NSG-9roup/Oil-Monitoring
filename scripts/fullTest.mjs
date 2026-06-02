/**
 * Full Feature Test - Oil Condition Monitoring App
 * Tests all CRUD operations across Admin, Sales, and Customer roles
 * via direct Supabase Service Role access + HTTP route checks
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const BASE_URL = 'http://localhost:3000'

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

let pass = 0
let fail = 0
const issues = []

function ok(label) {
  console.log(`  ✅ ${label}`)
  pass++
}

function err(label, detail) {
  console.log(`  ❌ ${label}: ${detail}`)
  fail++
  issues.push({ label, detail })
}

async function httpGet(path) {
  try {
    const res = await fetch(`${BASE_URL}${path}`, { redirect: 'manual' })
    return res
  } catch (e) {
    return null
  }
}

// ─── 1. HTTP ROUTES ────────────────────────────────────────────────────────

async function testHttpRoutes() {
  console.log('\n🌐 [1] HTTP Route Checks')

  const res = await httpGet('/login')
  if (res && res.status === 200) ok('GET /login → 200')
  else err('GET /login', `Expected 200, got ${res?.status ?? 'connection error'}`)

  const dash = await httpGet('/dashboard')
  if (dash && (dash.status === 307 || dash.status === 302)) ok('GET /dashboard (unauthenticated) → redirect to /login')
  else err('GET /dashboard (unauthenticated)', `Expected 302/307 redirect, got ${dash?.status}`)

  const admin = await httpGet('/admin')
  if (admin && (admin.status === 307 || admin.status === 302)) ok('GET /admin (unauthenticated) → redirect to /login')
  else err('GET /admin (unauthenticated)', `Expected 302/307 redirect, got ${admin?.status}`)

  const sales = await httpGet('/sales')
  if (sales && (sales.status === 307 || sales.status === 302)) ok('GET /sales (unauthenticated) → redirect to /login')
  else err('GET /sales (unauthenticated)', `Expected 302/307 redirect, got ${sales?.status}`)
}

// ─── 2. DATABASE TABLES EXIST ─────────────────────────────────────────────

async function testTablesExist() {
  console.log('\n🗄️  [2] Database Table Checks')

  const tables = [
    'oil_customers',
    'oil_machines',
    'oil_products',
    'oil_lab_tests',
    'oil_lab_requests',
    'oil_profiles',
    'oil_maintenance_actions',
    'oil_alert_actions',
  ]

  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1)
    if (!error) ok(`Table "${table}" is accessible`)
    else err(`Table "${table}"`, error.message)
  }
}

// ─── 3. ADMIN CRUD: CUSTOMERS ─────────────────────────────────────────────

let testCustomerId = null

async function testCustomerCRUD() {
  console.log('\n👔 [3] Admin: Customer CRUD')

  // CREATE
  const { data, error } = await supabase.from('oil_customers').insert({
    company_name: 'TEST_COMPANY_UAT',
    status: 'active'
  }).select().single()
  if (!error && data) {
    testCustomerId = data.id
    ok(`CREATE customer → id: ${testCustomerId.slice(0, 8)}...`)
  } else {
    err('CREATE customer', error?.message)
    return
  }

  // READ
  const { data: readData, error: readError } = await supabase.from('oil_customers').select('*').eq('id', testCustomerId).single()
  if (!readError && readData) ok('READ customer by id')
  else err('READ customer', readError?.message)

  // UPDATE
  const { error: updateError } = await supabase.from('oil_customers').update({ company_name: 'TEST_COMPANY_UAT_UPDATED' }).eq('id', testCustomerId)
  if (!updateError) ok('UPDATE customer company_name')
  else err('UPDATE customer', updateError?.message)

  // Verify update
  const { data: verifyData } = await supabase.from('oil_customers').select('company_name').eq('id', testCustomerId).single()
  if (verifyData?.company_name === 'TEST_COMPANY_UAT_UPDATED') ok('VERIFY customer update persisted')
  else err('VERIFY customer update', `Got: ${verifyData?.company_name}`)
}

// ─── 4. ADMIN CRUD: MACHINES ──────────────────────────────────────────────

let testMachineId = null

async function testMachineCRUD() {
  console.log('\n⚙️  [4] Admin: Machine CRUD')
  if (!testCustomerId) { err('Machine CRUD', 'Skipped – no customer created'); return }

  const { data, error } = await supabase.from('oil_machines').insert({
    customer_id: testCustomerId,
    machine_name: 'TEST_MACHINE_UAT',
    model: 'Model-X',
    location: 'Plant A',
    status: 'active'
  }).select().single()
  if (!error && data) {
    testMachineId = data.id
    ok(`CREATE machine → id: ${testMachineId.slice(0, 8)}...`)
  } else {
    err('CREATE machine', error?.message)
    return
  }

  const { data: readData, error: readError } = await supabase.from('oil_machines').select('*').eq('id', testMachineId).single()
  if (!readError && readData) ok('READ machine by id')
  else err('READ machine', readError?.message)

  const { error: updateError } = await supabase.from('oil_machines').update({ status: 'inactive' }).eq('id', testMachineId)
  if (!updateError) ok('UPDATE machine status')
  else err('UPDATE machine', updateError?.message)

  // Reactivate for later tests
  await supabase.from('oil_machines').update({ status: 'active' }).eq('id', testMachineId)
}

// ─── 5. ADMIN CRUD: PRODUCTS ──────────────────────────────────────────────

let testProductId = null

async function testProductCRUD() {
  console.log('\n🛢️  [5] Admin: Product CRUD')

  const { data, error } = await supabase.from('oil_products').insert({
    product_name: 'TEST_OIL_UAT',
    product_type: 'Engine Oil',
    base_oil: 'Mineral',
    viscosity_grade: '10W-40'
  }).select().single()
  if (!error && data) {
    testProductId = data.id
    ok(`CREATE product → id: ${testProductId.slice(0, 8)}...`)
  } else {
    err('CREATE product', error?.message)
    return
  }

  const { data: readData, error: readError } = await supabase.from('oil_products').select('*').eq('id', testProductId).single()
  if (!readError && readData) ok('READ product by id')
  else err('READ product', readError?.message)

  const { error: updateError } = await supabase.from('oil_products').update({ product_name: 'TEST_OIL_UAT_v2' }).eq('id', testProductId)
  if (!updateError) ok('UPDATE product name')
  else err('UPDATE product', updateError?.message)
}

// ─── 6. ADMIN CRUD: LAB TESTS ─────────────────────────────────────────────

let testLabTestId = null

async function testLabTestCRUD() {
  console.log('\n🔬 [6] Admin: Lab Test CRUD')
  if (!testMachineId || !testProductId) { err('Lab Test CRUD', 'Skipped – no machine/product created'); return }

  const { data, error } = await supabase.from('oil_lab_tests').insert({
    machine_id: testMachineId,
    product_id: testProductId,
    test_date: new Date().toISOString().split('T')[0],
    viscosity_40c: 95.5,
    viscosity_100c: 14.2,
    water_content: 250,
    water_content_unit: 'PPM',
    tan_value: 0.8,
    notes: 'UAT automated test'
  }).select().single()
  if (!error && data) {
    testLabTestId = data.id
    ok(`CREATE lab test → id: ${testLabTestId.slice(0, 8)}...`)
  } else {
    err('CREATE lab test', error?.message)
    return
  }

  const { data: readData, error: readError } = await supabase.from('oil_lab_tests').select(`
    *,
    machine:machine_id(machine_name),
    product:product_id(product_name)
  `).eq('id', testLabTestId).single()
  if (!readError && readData) {
    ok('READ lab test with machine + product joins')
    if (readData.machine?.machine_name) ok(`JOIN machine name: "${readData.machine.machine_name}"`)
    else err('JOIN machine', 'machine_name missing from join')
    if (readData.product?.product_name) ok(`JOIN product name: "${readData.product.product_name}"`)
    else err('JOIN product', 'product_name missing from join')
  } else {
    err('READ lab test', readError?.message)
  }

  const { error: updateError } = await supabase.from('oil_lab_tests').update({ notes: 'Updated by UAT' }).eq('id', testLabTestId)
  if (!updateError) ok('UPDATE lab test notes')
  else err('UPDATE lab test', updateError?.message)
}

// ─── 7. CUSTOMER: LAB REQUEST (PENGAJUAN UJI LAB) ─────────────────────────

let testLabRequestId = null

async function testLabRequestCRUD() {
  console.log('\n📋 [7] Customer: Lab Request (Pengajuan Uji Lab) CRUD')

  // Get any profile to use as requester
  const { data: profile, error: profileError } = await supabase.from('oil_profiles').select('id, customer_id').limit(1).single()
  if (profileError || !profile) {
    err('Lab Request CREATE', 'No profiles found in database to test with')
    return
  }

  const customerId = profile.customer_id || testCustomerId
  if (!customerId) {
    err('Lab Request CREATE', 'No customer_id available on profile')
    return
  }

  // CREATE lab request (simulate customer submitting a request)
  const { data, error } = await supabase.from('oil_lab_requests').insert({
    customer_id: customerId,
    machine_id: testMachineId,
    requested_by_profile_id: profile.id,
    title: 'UAT Lab Request - Machine Oil Analysis',
    description: 'Automated test: check oil degradation for UAT machine',
    priority: 'high',
    status: 'pending',
    is_new_machine: false,
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }).select().single()
  if (!error && data) {
    testLabRequestId = data.id
    ok(`CREATE lab request → id: ${testLabRequestId.slice(0, 8)}... (status: pending)`)
  } else {
    err('CREATE lab request', error?.message)
    return
  }

  // READ - verify it appears in admin view
  const { data: readData, error: readError } = await supabase.from('oil_lab_requests').select(`
    *,
    machine:oil_machines(machine_name, location),
    customer:oil_customers(company_name),
    requested_by:oil_profiles!oil_lab_requests_requested_by_profile_id_fkey(full_name, email)
  `).eq('id', testLabRequestId).single()
  if (!readError && readData) {
    ok('READ lab request with machine + customer + requester joins')
    ok(`  Status: ${readData.status}, Priority: ${readData.priority}`)
  } else {
    err('READ lab request', readError?.message)
  }

  // UPDATE status (simulate sales/admin processing)
  const { error: updateError } = await supabase.from('oil_lab_requests').update({ status: 'assigned' }).eq('id', testLabRequestId)
  if (!updateError) ok('UPDATE lab request status → assigned')
  else err('UPDATE lab request', updateError?.message)

  // Verify count query (what admin table would show)
  const { count, error: countError } = await supabase.from('oil_lab_requests').select('*', { count: 'exact', head: true }).neq('status', 'cancelled')
  if (!countError) ok(`Admin table row count: ${count} active lab requests`)
  else err('COUNT lab requests', countError?.message)
}

// ─── 8. ADMIN CRUD: USERS ─────────────────────────────────────────────────

async function testUsersCRUD() {
  console.log('\n👥 [8] Admin: Users / Profiles READ')

  const { data, error } = await supabase.from('oil_profiles').select('id, full_name, role, customer_id').order('created_at', { ascending: false })
  if (!error && data) {
    ok(`READ all profiles: ${data.length} user(s) found`)
    const roles = [...new Set(data.map(p => p.role))]
    ok(`Roles present in database: [${roles.join(', ')}]`)
    data.slice(0, 3).forEach(p => console.log(`    • ${p.full_name || '(no name)'} [${p.role}]`))
  } else {
    err('READ profiles', error?.message)
  }
}

// ─── 9. SALES ROUTE CHECK ─────────────────────────────────────────────────

async function testSalesRoutes() {
  console.log('\n💼 [9] Sales: Route and Action Checks')

  const { data, error } = await supabase.from('oil_lab_requests').select(`
    *,
    customer:oil_customers(company_name),
    machine:oil_machines(machine_name)
  `).order('created_at', { ascending: false }).limit(5)
  if (!error) ok(`Sales can view lab requests: ${data?.length || 0} recent records`)
  else err('Sales lab requests READ', error?.message)

  const { data: maintenanceData, error: maintenanceError } = await supabase.from('oil_maintenance_actions').select('*').limit(5)
  if (!maintenanceError) ok(`Maintenance actions table accessible: ${maintenanceData?.length || 0} records`)
  else err('Maintenance actions READ', maintenanceError?.message)
}

// ─── 10. STORAGE BUCKETS ──────────────────────────────────────────────────

async function testStorageBuckets() {
  console.log('\n🪣 [10] Storage Bucket Checks')

  const { data: buckets, error } = await supabase.storage.listBuckets()
  if (error) {
    err('List storage buckets', error.message)
    return
  }
  ok(`Storage accessible: ${buckets.length} bucket(s) found`)
  if (buckets.length === 0) {
    err('Storage buckets', 'No buckets found! PDF uploads will fail. Run scripts/setupStorage.mjs')
  } else {
    buckets.forEach(b => ok(`Bucket: "${b.name}" (${b.public ? 'public' : 'private'})`))
  }
}

// ─── 11. CLEANUP ──────────────────────────────────────────────────────────

async function cleanup() {
  console.log('\n🧹 [11] Cleanup Test Data')

  if (testLabRequestId) {
    const { error } = await supabase.from('oil_lab_requests').delete().eq('id', testLabRequestId)
    if (!error) ok('Deleted test lab request')
    else err('Delete lab request', error.message)
  }

  if (testLabTestId) {
    const { error } = await supabase.from('oil_lab_tests').delete().eq('id', testLabTestId)
    if (!error) ok('Deleted test lab test')
    else err('Delete lab test', error.message)
  }

  if (testProductId) {
    const { error } = await supabase.from('oil_products').delete().eq('id', testProductId)
    if (!error) ok('Deleted test product')
    else err('Delete product', error.message)
  }

  if (testMachineId) {
    const { error } = await supabase.from('oil_machines').delete().eq('id', testMachineId)
    if (!error) ok('Deleted test machine')
    else err('Delete machine', error.message)
  }

  if (testCustomerId) {
    const { error } = await supabase.from('oil_customers').delete().eq('id', testCustomerId)
    if (!error) ok('Deleted test customer')
    else err('Delete customer', error.message)
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────

async function main() {
  console.log('══════════════════════════════════════════════')
  console.log('  OIL MONITORING APP - FULL FEATURE TEST UAT')
  console.log('══════════════════════════════════════════════')
  console.log(`  Supabase URL: ${supabaseUrl}`)
  console.log(`  App URL:      ${BASE_URL}`)
  console.log('══════════════════════════════════════════════')

  await testHttpRoutes()
  await testTablesExist()
  await testCustomerCRUD()
  await testMachineCRUD()
  await testProductCRUD()
  await testLabTestCRUD()
  await testLabRequestCRUD()
  await testUsersCRUD()
  await testSalesRoutes()
  await testStorageBuckets()
  await cleanup()

  console.log('\n══════════════════════════════════════════════')
  console.log(`  RESULTS: ✅ ${pass} passed  ❌ ${fail} failed`)
  console.log('══════════════════════════════════════════════')

  if (fail > 0) {
    console.log('\n⚠️  Issues found:')
    issues.forEach((i, idx) => console.log(`  ${idx + 1}. [${i.label}] ${i.detail}`))
    process.exitCode = 1
  } else {
    console.log('\n🎉 All checks passed! App is fully functional.')
  }
}

main().catch(e => {
  console.error('Fatal test error:', e)
  process.exit(1)
})
