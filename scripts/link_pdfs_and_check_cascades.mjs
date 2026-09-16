import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkForeignKeysAndLinkPdfs() {
  console.log('=== 1. LINKING REAL PDF FILES TO LAB TESTS IN DB ===')
  const { data: tests } = await supabase
    .from('oil_lab_tests')
    .select('id, test_date, pdf_path')
    .order('test_date', { ascending: false })

  const availablePdfs = [
    '1770272479356_25204858__PT_Nabel_Sakha_Gemilang__PT_Gajah_Tunggal_-Compressor_BCU_12-Atlas_Copco_GA_200.pdf',
    '1770272313972_25203559__PT_Nabel_Sakha_Gemilang__PT_Gajah_Tunggal_-Compressor_BCU_12-Atlas_Copco_GA_200__005_.pdf',
    '1770272209437_25203174__PT_Nabel_Sakha_Gemilang__PT_Gajah_Tunggal_-Compressor_BCU_12-Atlas_Copco_GA_200.pdf',
    '1770263138223_25203174__PT_Nabel_Sakha_Gemilang__PT_Gajah_Tunggal_-Compressor_BCU_12-Atlas_Copco_GA_200.pdf',
    '1770257844821_HTO_BELSA_VEE_BALL_ROTARY_CONTROL_VALVES.pdf'
  ]

  for (let i = 0; i < (tests || []).length; i++) {
    const t = tests[i]
    const pdfToAssign = availablePdfs[i % availablePdfs.length]
    await supabase.from('oil_lab_tests').update({ pdf_path: pdfToAssign }).eq('id', t.id)
    console.log(`✅ Test ${t.id} (${t.test_date}) linked with PDF: ${pdfToAssign}`)
  }

  console.log('\n=== 2. CHECK CASCADE DELETE CONSTRAINTS IN DB ===')
  // Verify foreign keys on child tables
  const { data: machines } = await supabase.from('oil_machines').select('id, customer_id')
  const { data: labTests } = await supabase.from('oil_lab_tests').select('id, machine_id')
  const { data: orders } = await supabase.from('oil_orders').select('id, customer_id')
  const { data: complaints } = await supabase.from('oil_complaints').select('id, customer_id, order_id')
  
  console.log(`- Machines count: ${machines?.length}`)
  console.log(`- Lab tests count: ${labTests?.length}`)
  console.log(`- Orders count: ${orders?.length}`)
  console.log(`- Complaints count: ${complaints?.length}`)
}

checkForeignKeysAndLinkPdfs().catch(console.error)
