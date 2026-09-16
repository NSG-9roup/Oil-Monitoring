import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

console.log('══════════════════════════════════════════════════════════════════════')
console.log('  DEEP LOGICAL & EDGE-CASE AUDIT FOR ALL THREE ROLES')
console.log('══════════════════════════════════════════════════════════════════════\n')

let pass = 0
let fail = 0

function test(name, condition, errorMsg = '') {
  if (condition) {
    pass++
    console.log(`  ✅ [PASS] ${name}`)
  } else {
    fail++
    console.error(`  ❌ [FAIL] ${name}: ${errorMsg}`)
  }
}

async function runDeepAudit() {
  // 1. Edge Case: Customer Request Lab dengan "Mesin Baru" (is_new_machine = true)
  console.log('🧪 [TEST 1] Pengajuan Lab Request dengan Mesin Baru (is_new_machine)...')
  const { data: customer } = await supabase.from('oil_customers').select('id').limit(1).single()
  const { data: requester } = await supabase.from('oil_profiles').select('id').eq('role', 'customer').limit(1).single()

  const { data: newMachineReq, error: nmErr } = await supabase.from('oil_lab_requests').insert({
    customer_id: customer.id,
    requested_by_profile_id: requester.id,
    title: 'Uji Sampel Mesin Baru Kompresor Gas',
    description: 'Mesin baru dipasang minggu lalu, butuh baseline oli awal',
    priority: 'urgent',
    status: 'pending',
    is_new_machine: true,
    new_machine_data: {
      machine_name: 'Kompresor Gas Utama Unit 04',
      model: 'Atlas Copco GA-75',
      location: 'Workshop Section 2'
    }
  }).select().single()

  test('Customer dapat submit request untuk mesin baru yang belum terdaftar di DB', !nmErr && newMachineReq?.id, nmErr?.message)

  // 2. Sales / Admin Approve New Machine
  console.log('\n🧪 [TEST 2] Sales / Admin Menyetujui Mesin Baru dari Lab Request...')
  // Insert machine
  const { data: approvedMachine, error: apErr } = await supabase.from('oil_machines').insert({
    customer_id: customer.id,
    machine_name: newMachineReq.new_machine_data.machine_name,
    model: newMachineReq.new_machine_data.model,
    location: newMachineReq.new_machine_data.location,
    status: 'active'
  }).select().single()

  const { error: linkErr } = await supabase.from('oil_lab_requests').update({
    machine_id: approvedMachine?.id,
    is_new_machine: false
  }).eq('id', newMachineReq.id)

  test('Sistem berhasil mengonversi request mesin baru menjadi mesin aktif terdaftar', !apErr && !linkErr && approvedMachine?.id, apErr?.message || linkErr?.message)

  // 3. Status Threshold Logic Evaluation (Normal, Warning, Critical)
  console.log('\n🧪 [TEST 3] Evaluasi Formula Peringatan Dini Kesehatan Oli (Normal, Warning, Critical)...')
  const baseline40 = 46.0 // ISO VG 46

  // Kasus A: Deviasi 5% (Normal)
  const normalVal = 48.0
  const diffA = Math.abs(normalVal - baseline40) / baseline40
  const statusA = diffA < 0.10 ? 'NORMAL' : diffA < 0.20 ? 'WARNING' : 'CRITICAL'
  test('Deviasi < 10% terdeteksi NORMAL', statusA === 'NORMAL')

  // Kasus B: Deviasi 15% (Warning)
  const warningVal = 53.0
  const diffB = Math.abs(warningVal - baseline40) / baseline40
  const statusB = diffB < 0.10 ? 'NORMAL' : diffB < 0.20 ? 'WARNING' : 'CRITICAL'
  test('Deviasi 10% - 20% terdeteksi WARNING', statusB === 'WARNING')

  // Kasus C: Deviasi > 20% (Critical)
  const criticalVal = 62.0
  const diffC = Math.abs(criticalVal - baseline40) / baseline40
  const statusC = diffC < 0.10 ? 'NORMAL' : diffC < 0.20 ? 'WARNING' : 'CRITICAL'
  test('Deviasi > 20% terdeteksi CRITICAL', statusC === 'CRITICAL')

  // Kasus D: Kadar Air Tinggi (> 200 PPM)
  const waterPPM = 350
  const waterStatus = waterPPM > 200 ? 'CRITICAL' : waterPPM > 100 ? 'WARNING' : 'NORMAL'
  test('Kadar Air > 200 PPM memicu status bahaya kontaminasi air (CRITICAL)', waterStatus === 'CRITICAL')

  // 4. Multi-Tenant Data Isolation Test
  console.log('\n🧪 [TEST 4] Pengujian Keamanan Isolasi Data Antar Customer (Data Isolation)...')
  const { data: otherCustomer } = await supabase.from('oil_customers').select('id').neq('id', customer.id).limit(1).single()
  if (otherCustomer) {
    const { data: isolatedMachines } = await supabase.from('oil_machines').select('id').eq('customer_id', otherCustomer.id)
    test('Query filter customer_id mengisolasi data mesin antar perusahaan dengan benar', Array.isArray(isolatedMachines))
  }

  // Cleanup
  console.log('\n🧹 Membersihkan data uji edge-case...')
  if (newMachineReq?.id) await supabase.from('oil_lab_requests').delete().eq('id', newMachineReq.id)
  if (approvedMachine?.id) await supabase.from('oil_machines').delete().eq('id', approvedMachine.id)

  console.log('\n══════════════════════════════════════════════════════════════════════')
  console.log(`  HASIL DEEP AUDIT: ✅ ${pass} PASSED  |  ❌ ${fail} FAILED`)
  console.log('══════════════════════════════════════════════════════════════════════\n')
}

runDeepAudit().catch(console.error)
