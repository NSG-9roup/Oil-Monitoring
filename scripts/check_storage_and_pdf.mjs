import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkStorageAndDb() {
  console.log('=== 1. CHECK OIL_LAB_TESTS PDF_PATH IN DB ===')
  const { data: tests, error: tErr } = await supabase
    .from('oil_lab_tests')
    .select('id, machine_id, test_date, pdf_path, product:oil_products(product_name), machine:oil_machines(machine_name)')
  console.log('Lab tests count in DB:', tests?.length)
  for (const t of tests || []) {
    console.log(`- Test ID: ${t.id}, Date: ${t.test_date}, Machine: ${t.machine?.machine_name}, pdf_path: ${t.pdf_path}`)
  }

  console.log('\n=== 2. LIST FILES IN STORAGE BUCKET "lab-reports" ===')
  const { data: files, error: fErr } = await supabase.storage.from('lab-reports').list('', { limit: 100 })
  console.log('Files in lab-reports bucket:', files)
  if (fErr) console.error('Error listing lab-reports:', fErr)

  console.log('\n=== 3. CHECK PUBLIC URL GENERATION ===')
  if (files && files.length > 0) {
    for (const f of files) {
      const { data } = supabase.storage.from('lab-reports').getPublicUrl(f.name)
      console.log(`- File: ${f.name} -> Public URL: ${data?.publicUrl}`)
    }
  }

  console.log('\n=== 4. CHECK ORPHANED / CASCADE RELATIONS IN DB ===')
  // Check if deleting a customer cascades or orphans machines/tests
  const { data: customers } = await supabase.from('oil_customers').select('id, company_name')
  console.log('Total customers in DB:', customers?.length)
  const { data: machines } = await supabase.from('oil_machines').select('id, customer_id, machine_name')
  console.log('Total machines in DB:', machines?.length)
}

checkStorageAndDb().catch(console.error)
