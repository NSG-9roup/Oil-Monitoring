import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'

const env = {}
if (existsSync('.env.local')) {
  const envContent = readFileSync('.env.local', 'utf-8')
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const index = trimmed.indexOf('=')
    if (index !== -1) {
      env[trimmed.substring(0, index).trim()] = trimmed.substring(index + 1).trim()
    }
  })
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function inspect() {
  console.log('--- CUSTOMER PROFILES ---')
  const { data: profiles, error: pErr } = await supabase
    .from('oil_profiles')
    .select('id, email, role, customer_id')
    .eq('role', 'customer')
  if (pErr) console.error('Error fetching profiles:', pErr)
  else console.log(profiles)

  console.log('--- LAB REQUESTS ---')
  const { data: requests, error: rErr } = await supabase
    .from('oil_lab_requests')
    .select('id, customer_id, title, status, created_at')
  if (rErr) console.error('Error fetching requests:', rErr)
  else console.log(requests)
}

inspect().catch(console.error)
