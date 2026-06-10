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
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function test() {
  const { data, error } = await supabase
    .from('oil_lab_requests')
    .select(`
      *,
      machine:oil_machines(machine_name, location),
      assigned_to:oil_profiles(full_name)
    `)
    .eq('customer_id', '2e91e41d-c3ea-4d25-a7bb-62e12942f9e7')

  console.log('--- TEST AMBIGUOUS QUERY ---')
  if (error) console.error('Error:', error)
  else console.log('Data:', data)

  const { data: data2, error: error2 } = await supabase
    .from('oil_lab_requests')
    .select(`
      *,
      machine:oil_machines(machine_name, location),
      assigned_to:oil_profiles!oil_lab_requests_assigned_to_profile_id_fkey(full_name)
    `)
    .eq('customer_id', '2e91e41d-c3ea-4d25-a7bb-62e12942f9e7')

  console.log('--- TEST FIXED QUERY ---')
  if (error2) console.error('Error:', error2)
  else console.log('Data count:', data2.length, 'Data sample:', data2[0])
}

test().catch(console.error)
