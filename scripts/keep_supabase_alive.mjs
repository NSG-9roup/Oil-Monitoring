import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.resolve(__dirname, '..')

// Auto-load .env.local if environment variables are not already populated
function loadEnvLocal() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    return
  }
  const envPath = path.join(ROOT_DIR, '.env.local')
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf-8')
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim()
          let val = trimmed.slice(eqIdx + 1).trim()
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1)
          }
          if (!process.env[key]) {
            process.env[key] = val
          }
        }
      }
    } catch {
      // Ignore reading error
    }
  }
}

loadEnvLocal()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const DEPLOYED_URL = process.env.DEPLOYED_APP_URL || 'https://oil-track.vercel.app'

// Parse CLI flags
const args = process.argv.slice(2)
const isLoop = args.includes('--loop') || args.includes('-l') || args.includes('--daemon') || args.includes('-d')

let intervalHours = 24
const intervalArgIdx = args.findIndex(a => a === '--interval' || a === '-i')
if (intervalArgIdx !== -1 && args[intervalArgIdx + 1]) {
  const parsed = parseFloat(args[intervalArgIdx + 1])
  if (!isNaN(parsed) && parsed > 0) {
    intervalHours = parsed
  }
}

const logFile = path.join(ROOT_DIR, 'scripts', 'keep_alive.log')

function writeLog(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  process.stdout.write(line)
  try {
    fs.appendFileSync(logFile, line)
  } catch {
    // ignore logging failure
  }
}

async function pingViaEndpoint() {
  writeLog(`[1/2] Pinging deployment endpoint: ${DEPLOYED_URL}/api/ping ...`)
  try {
    const res = await fetch(`${DEPLOYED_URL}/api/ping`, {
      method: 'GET',
      headers: {
        'User-Agent': 'OilTrack-KeepAlive-Bot/2.0'
      },
      signal: AbortSignal.timeout(15000)
    })
    const data = await res.json()
    if (res.ok && data.success) {
      writeLog(`✅ Endpoint ping SUCCESS: ${data.message} (${data.timestamp})`)
      return true
    } else {
      writeLog(`⚠️ Endpoint ping returned non-success: ${JSON.stringify(data)}`)
      return false
    }
  } catch (err) {
    writeLog(`❌ Endpoint ping failed: ${err.message}`)
    return false
  }
}

async function pingViaDirectSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    writeLog('[2/2] Supabase env variables not found in environment, skipping direct DB ping.')
    return false
  }

  writeLog(`[2/2] Pinging Supabase directly at ${SUPABASE_URL} ...`)
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    })
    const { data, error } = await supabase
      .from('oil_products')
      .select('id, product_name')
      .limit(1)

    if (error) throw error

    writeLog(`✅ Direct Supabase query SUCCESS: ${JSON.stringify(data)}`)
    return true
  } catch (err) {
    writeLog(`❌ Direct Supabase query failed: ${err.message}`)
    return false
  }
}

async function executePing() {
  writeLog('====================================================')
  writeLog('🚀 Starting Supabase Keep-Alive Ping')
  writeLog('====================================================')

  const endpointOk = await pingViaEndpoint()
  const directOk = await pingViaDirectSupabase()

  if (endpointOk || directOk) {
    writeLog('🎉 Supabase is ACTIVE and refreshed. Inactivity timer reset!')
    return true
  } else {
    writeLog('🔥 All ping attempts failed. Please check internet connection or URL.')
    return false
  }
}

async function main() {
  if (!isLoop) {
    const success = await executePing()
    process.exitCode = success ? 0 : 1
    return
  }

  writeLog(`🔁 Keep-Alive DAEMON mode started. Running every ${intervalHours} hour(s). Press Ctrl+C to stop.`)
  await executePing()

  const intervalMs = intervalHours * 60 * 60 * 1000
  setInterval(async () => {
    await executePing()
    const nextRun = new Date(Date.now() + intervalMs).toLocaleString()
    writeLog(`⏳ Next scheduled ping at: ${nextRun}`)
  }, intervalMs)

  const nextRun = new Date(Date.now() + intervalMs).toLocaleString()
  writeLog(`⏳ Next scheduled ping at: ${nextRun}`)
}

main().catch(err => {
  writeLog(`Fatal error: ${err.message}`)
  process.exitCode = 1
})