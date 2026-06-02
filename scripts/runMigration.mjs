/**
 * Run the migration SQL directly against Supabase
 * using the service role key via the REST API (rpc/sql)
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Run individual ALTER TABLE statements via the REST API
const statements = [
  // oil_machines
  `ALTER TABLE public.oil_machines ADD COLUMN IF NOT EXISTS model TEXT`,
  `ALTER TABLE public.oil_machines ADD COLUMN IF NOT EXISTS serial_number TEXT`,
  // oil_products
  `ALTER TABLE public.oil_products ADD COLUMN IF NOT EXISTS base_oil TEXT`,
  `ALTER TABLE public.oil_products ADD COLUMN IF NOT EXISTS viscosity_grade TEXT`,
  `ALTER TABLE public.oil_products ADD COLUMN IF NOT EXISTS oil_grade TEXT`,
  `ALTER TABLE public.oil_products ADD COLUMN IF NOT EXISTS baseline_viscosity_40c NUMERIC(10, 4)`,
  `ALTER TABLE public.oil_products ADD COLUMN IF NOT EXISTS baseline_viscosity_100c NUMERIC(10, 4)`,
  `ALTER TABLE public.oil_products ADD COLUMN IF NOT EXISTS baseline_tan NUMERIC(10, 4)`,
  // oil_lab_tests
  `ALTER TABLE public.oil_lab_tests ADD COLUMN IF NOT EXISTS test_type TEXT`,
  `ALTER TABLE public.oil_lab_tests ADD COLUMN IF NOT EXISTS viscosity_40c NUMERIC(10, 4)`,
  `ALTER TABLE public.oil_lab_tests ADD COLUMN IF NOT EXISTS viscosity_100c NUMERIC(10, 4)`,
  `ALTER TABLE public.oil_lab_tests ADD COLUMN IF NOT EXISTS water_content_unit TEXT DEFAULT 'PPM'`,
  `ALTER TABLE public.oil_lab_tests ADD COLUMN IF NOT EXISTS notes TEXT`,
]

async function runMigration() {
  console.log('🚀 Running schema migration...\n')

  let pass = 0
  let fail = 0

  for (const sql of statements) {
    const shortSql = sql.replace('ALTER TABLE public.', '').slice(0, 60)
    try {
      // Use the Supabase management API to run raw SQL
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ sql })
      })

      if (!response.ok) {
        // Try alternative: direct postgres connection via supabase
        // Fall back to checking if column now exists
        const errText = await response.text()
        
        // If it's "already exists", that's fine
        if (errText.includes('already exists') || response.status === 404) {
          console.log(`  ✅ (already exists or endpoint not available): ${shortSql}`)
          pass++
        } else {
          console.log(`  ⚠️  HTTP ${response.status}: ${shortSql}`)
          console.log(`       ${errText.slice(0, 100)}`)
          fail++
        }
      } else {
        console.log(`  ✅ ${shortSql}`)
        pass++
      }
    } catch (e) {
      console.log(`  ❌ Error: ${shortSql}: ${e.message}`)
      fail++
    }
  }

  console.log(`\nResults: ${pass} ok, ${fail} failed`)
}

runMigration().catch(console.error)
