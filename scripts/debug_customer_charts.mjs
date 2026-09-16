import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugCustomerData() {
  console.log('=== 1. CHECK ALL CUSTOMERS WITH MACHINES & TESTS ===')
  const { data: customers } = await supabase.from('oil_customers').select('id, company_name')
  console.log(`Total customers: ${customers?.length}`)
  
  const gajahTunggal = customers?.find(c => c.company_name.toLowerCase().includes('gajah tunggal'))
  console.log('PT Gajah Tunggal record:', gajahTunggal)

  console.log('\n=== 2. CHECK PROFILES ===')
  const { data: profiles } = await supabase.from('oil_profiles').select('id, email, role, customer_id, full_name')
  console.log('Profiles in DB:', profiles)

  console.log('\n=== 3. CHECK MACHINES ===')
  const { data: machines } = await supabase.from('oil_machines').select('id, customer_id, machine_name, model, status')
  console.log('Machines in DB:', machines)

  console.log('\n=== 4. CHECK LAB TESTS ===')
  const { data: labTests } = await supabase.from('oil_lab_tests').select('id, machine_id, product_id, test_date, viscosity_40c, viscosity_100c, water_content, tan_value, notes, pdf_path')
  console.log('Lab Tests in DB:', labTests)
}

debugCustomerData().catch(console.error)
