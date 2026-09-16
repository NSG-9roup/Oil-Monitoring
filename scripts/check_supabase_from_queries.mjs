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
  'profiles',
  'customers',
  'machines',
  'products',
  'lab_tests',
  'orders',
  'complaints'
]

console.log('=== CHECKING SUPABASE.FROM() TARGETS FOR NON-PREFIXED TABLES ===\n')

for (const t of tablesToCheck) {
  const matches = []
  for (const file of allFiles) {
    const content = readFileSync(file, 'utf-8')
    const regex = new RegExp(`\\.from\\(['"\`]${t}['"\`]\\)`, 'g')
    const m = content.match(regex)
    if (m) {
      matches.push(file)
    }
  }
  console.log(`supabase.from('${t}') => ${matches.length > 0 ? `USED in: ${matches.join(', ')}` : '❌ NEVER QUERIED'}`)
}
