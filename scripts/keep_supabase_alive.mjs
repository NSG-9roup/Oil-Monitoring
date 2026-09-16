import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const DEPLOYED_URL = process.env.DEPLOYED_APP_URL || 'https://oil-track.vercel.app'

async function pingViaEndpoint() {
  console.log(`[1/2] Pinging deployment endpoint: ${DEPLOYED_URL}/api/ping ...`)
  try {
    const res = await fetch(`${DEPLOYED_URL}/api/ping`, {
      method: 'GET',
      headers: {
        'User-Agent': 'OilTrack-KeepAlive-Bot/1.0'
      }
    })
    const data = await res.json()
    if (res.ok && data.success) {
      console.log('✅ Endpoint ping SUCCESS:', data.message, `(${data.timestamp})`)
      return true
    } else {
      console.warn('⚠️ Endpoint ping returned non-success:', data)
      return false
    }
  } catch (err) {
    console.error('❌ Endpoint ping failed:', err.message)
    return false
  }
}

async function pingViaDirectSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('[2/2] Supabase env variables not found in environment, skipping direct DB ping.')
    return false
  }

  console.log(`[2/2] Pinging Supabase directly at ${SUPABASE_URL} ...`)
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const { data, error } = await supabase
      .from('oil_products')
      .select('id, product_name')
      .limit(1)

    if (error) throw error

    console.log('✅ Direct Supabase query SUCCESS:', data)
    return true
  } catch (err) {
    console.error('❌ Direct Supabase query failed:', err.message)
    return false
  }
}

async function run() {
  console.log('====================================================')
  console.log('🚀 Starting Supabase Keep-Alive Ping')
  console.log(`🕒 Time: ${new Date().toISOString()}`)
  console.log('====================================================')

  const endpointOk = await pingViaEndpoint()
  const directOk = await pingViaDirectSupabase()

  if (endpointOk || directOk) {
    console.log('🎉 Supabase is ACTIVE and refreshed. Inactivity timer reset!')
    process.exit(0)
  } else {
    console.error('🔥 All ping attempts failed. Please check internet connection or URL.')
    process.exit(1)
  }
}

run()