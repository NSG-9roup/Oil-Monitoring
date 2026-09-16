import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAllTables() {
  const candidateTables = [
    // Active core tables
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
    // Potential legacy or candidate unused tables
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

  console.log('=== SCANNING TABLES IN SUPABASE ===\n')
  const existingTables = []

  for (const t of candidateTables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true })
    if (!error) {
      existingTables.push({ table: t, count: count ?? 0 })
      console.log(`[FOUND] public.${t} (Rows: ${count ?? 0})`)
    }
  }

  console.log('\nTotal existing tables discovered:', existingTables.length)
}

checkAllTables().catch(console.error)
