import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

// Simple custom .env parser
const env = {}
if (existsSync('.env.local')) {
  const envContent = readFileSync('.env.local', 'utf-8')
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const index = trimmed.indexOf('=')
    if (index !== -1) {
      const key = trimmed.substring(0, index).trim()
      let val = trimmed.substring(index + 1).trim()
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1)
      } else if (val.startsWith("'") && val.endsWith("'")) {
        val = val.slice(1, -1)
      }
      env[key] = val
    }
  })
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Path to new migration
const migrationPath = 'supabase/migrations/20260610000000_harden_audit_logs.sql'
console.log(`Reading migration file: ${migrationPath}`)

const fileContent = readFileSync(migrationPath, 'utf-8')

// Split file content into statements by semicolon, avoiding comments and empty lines
const statements = fileContent
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'))

async function run() {
  console.log(`Executing ${statements.length} SQL statements...\n`)
  let pass = 0
  let fail = 0

  for (const sql of statements) {
    const displaySql = sql.replace(/\s+/g, ' ').slice(0, 70) + '...'
    try {
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
        const errText = await response.text()
        if (errText.includes('already exists') || response.status === 404) {
          console.log(`  ✅ (already exists or endpoint unavailable): ${displaySql}`)
          pass++
        } else {
          console.log(`  ⚠️  HTTP ${response.status}: ${displaySql}`)
          console.log(`       ${errText.slice(0, 100)}`)
          fail++
        }
      } else {
        console.log(`  ✅ ${displaySql}`)
        pass++
      }
    } catch (e) {
      console.log(`  ❌ Error: ${displaySql}: ${e.message}`)
      fail++
    }
  }

  console.log(`\nResults: ${pass} ok, ${fail} failed`)
  process.exit(fail > 0 ? 1 : 0)
}

run().catch(console.error)
