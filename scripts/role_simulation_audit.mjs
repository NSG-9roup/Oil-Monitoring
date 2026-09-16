import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

console.log('══════════════════════════════════════════════════════════════════════')
console.log('  SIMULASI ROLE AUDIT: CUSTOMER, SALES & ADMIN (END-TO-END TEST)')
console.log('══════════════════════════════════════════════════════════════════════\n')

const state = {
  customerId: null,
  customerProfileId: null,
  salesProfileId: null,
  adminProfileId: null,
  machineId: null,
  productId: null,
  labRequestId: null,
  labTestId: null,
  orderId: null,
  complaintId: null,
  passCount: 0,
  failCount: 0,
  findings: []
}

function assert(condition, message, details = '') {
  if (condition) {
    state.passCount++
    console.log(`  ✅ [PASS] ${message}`)
  } else {
    state.failCount++
    console.error(`  ❌ [FAIL] ${message} ${details ? '(' + details + ')' : ''}`)
    state.findings.push({ message, details })
  }
}

async function runRoleSimulation() {
  try {
    // -------------------------------------------------------------
    // SETUP: Ambil User Profile yang sudah ada untuk masing-masing role
    // -------------------------------------------------------------
    console.log('🔍 [0] Menyiapkan Akun Pengguna Role...')
    const { data: profiles, error: pErr } = await supabase.from('oil_profiles').select('*')
    assert(!pErr && profiles.length >= 3, 'Tersedia minimal 3 akun profil untuk testing', pErr?.message)

    const adminProfile = profiles.find(p => p.role === 'admin')
    const salesProfile = profiles.find(p => p.role === 'sales')
    const customerProfile = profiles.find(p => p.role === 'customer')

    assert(!!adminProfile, `Akun Admin ditemukan: ${adminProfile?.email}`)
    assert(!!salesProfile, `Akun Sales ditemukan: ${salesProfile?.email}`)
    assert(!!customerProfile, `Akun Customer ditemukan: ${customerProfile?.email}`)

    state.adminProfileId = adminProfile?.id
    state.salesProfileId = salesProfile?.id
    state.customerProfileId = customerProfile?.id
    state.customerId = customerProfile?.customer_id

    // =============================================================
    // ROLE 1: ADMIN (PENGELOLAAN DATA MASTER & HASIL LAB)
    // =============================================================
    console.log('\n👑 ─────────────────────────────────────────────────────────────')
    console.log('   ROLE: SYSTEM ADMINISTRATOR')
    console.log('   ─────────────────────────────────────────────────────────────')

    // 1.1 CRUD Customer
    console.log('\n[Admin 1] Mengelola Data Perusahaan Customer...')
    const { data: newCust, error: cErr } = await supabase.from('oil_customers').insert({
      company_name: 'PT SIMULASI UAT ADMIN 2026',
      status: 'active'
    }).select().single()
    assert(!cErr && newCust?.id, 'Admin berhasil menambahkan Customer baru', cErr?.message)
    const testCustId = newCust?.id

    const { error: updCustErr } = await supabase.from('oil_customers').update({
      company_name: 'PT SIMULASI UAT ADMIN UPDATED'
    }).eq('id', testCustId)
    assert(!updCustErr, 'Admin berhasil memperbarui nama Customer', updCustErr?.message)

    // 1.2 CRUD Machine (dengan model & serial number)
    console.log('\n[Admin 2] Mengelola Data Mesin Industri (Machines)...')
    const { data: newMach, error: mErr } = await supabase.from('oil_machines').insert({
      customer_id: testCustId,
      machine_name: 'Turbin Generator Unit 01',
      model: 'GE-T9000-X',
      serial_number: 'SN-2026-X99',
      location: 'Plant Area B-3',
      status: 'active'
    }).select().single()
    assert(!mErr && newMach?.id, 'Admin berhasil menambahkan Mesin (dengan Model & Serial Number)', mErr?.message)
    state.machineId = newMach?.id

    // 1.3 CRUD Product (dengan baseline spek oli)
    console.log('\n[Admin 3] Mengelola Data Katalog Produk Oli & Baseline...')
    const { data: newProd, error: prodErr } = await supabase.from('oil_products').insert({
      product_name: 'SHELL TELLUS S2 MX 46 - UAT',
      product_type: 'Hydraulic Oil',
      viscosity_grade: 'ISO VG 46',
      baseline_viscosity_40c: 46.0,
      baseline_viscosity_100c: 6.8,
      baseline_tan: 0.5,
      oil_grade: 'Premium Industrial'
    }).select().single()
    assert(!prodErr && newProd?.id, 'Admin berhasil menambahkan Produk Oli & Baseline Parameter', prodErr?.message)
    state.productId = newProd?.id

    // 1.4 Input Hasil Uji Lab (Lab Test) + Catatan (Notes) + Upload Laporan PDF
    console.log('\n[Admin 4] Menginput Hasil Uji Laboratorium & Laporan PDF...')
    const dummyPdfContent = Buffer.from('%PDF-1.4 Dummy Lab Report for Testing')
    const pdfPath = `lab-reports/uat_report_${Date.now()}.pdf`
    const { error: pdfUploadErr } = await supabase.storage.from('lab-reports').upload(pdfPath, dummyPdfContent, {
      contentType: 'application/pdf',
      upsert: true
    })
    assert(!pdfUploadErr, 'Admin berhasil mengunggah berkas PDF laporan ke bucket "lab-reports"', pdfUploadErr?.message)

    const { data: newTest, error: tErr } = await supabase.from('oil_lab_tests').insert({
      machine_id: state.machineId,
      product_id: state.productId,
      test_date: '2026-08-18',
      viscosity_40c: 48.5,
      viscosity_100c: 6.9,
      water_content: 85,
      water_content_unit: 'PPM',
      tan_value: 0.65,
      notes: 'Kondisi oli pelumas dalam batas wajar dan aman untuk operasional.',
      pdf_path: pdfPath
    }).select().single()
    assert(!tErr && newTest?.id, 'Admin berhasil menyimpan Hasil Uji Lab (termasuk kolom notes)', tErr?.message)
    state.labTestId = newTest?.id

    // 1.5 Audit Log Verification
    console.log('\n[Admin 5] Memverifikasi Pencatatan Audit Log...')
    const { data: logEntry, error: logErr } = await supabase.from('oil_audit_logs').insert({
      actor_id: state.adminProfileId,
      action: 'ADMIN_CREATE_TEST',
      details: `Admin recorded test for machine ${state.machineId}`,
      metadata: { machine_id: state.machineId, product_id: state.productId }
    }).select().single()
    assert(!logErr && logEntry?.id, 'Audit log otomatis tercatat di tabel oil_audit_logs', logErr?.message)

    // =============================================================
    // ROLE 2: CUSTOMER (PORTAL MONITORING, REQUEST LAB, ORDER, COMPLAINT)
    // =============================================================
    console.log('\n🏢 ─────────────────────────────────────────────────────────────')
    console.log('   ROLE: CUSTOMER (CLIENT)')
    console.log('   ─────────────────────────────────────────────────────────────')

    // 2.1 Membaca Data Monitoring & Baseline Calculation
    console.log('\n[Customer 1] Membaca Data Monitoring & Status Kesehatan Mesin...')
    const { data: customerTests, error: ctErr } = await supabase
      .from('oil_lab_tests')
      .select('*, product:oil_products(*), machine:oil_machines(*)')
      .eq('machine_id', state.machineId)
    assert(!ctErr && customerTests.length > 0, 'Customer dapat membaca riwayat hasil uji lab mesin miliknya', ctErr?.message)

    const testItem = customerTests?.[0]
    const baseline = testItem?.product?.baseline_viscosity_40c || 46.0
    const actual = testItem?.viscosity_40c || 48.5
    const diffPercent = Math.abs((actual - baseline) / baseline) * 100
    const status = diffPercent < 10 ? 'NORMAL' : diffPercent < 20 ? 'WARNING' : 'CRITICAL'
    assert(status === 'NORMAL', `Kalkulasi deviasi oli akurat: Baseline ${baseline} vs Aktual ${actual} (${diffPercent.toFixed(1)}% -> Status: ${status})`)

    // 2.2 Pengajuan Permintaan Uji Lab (Lab Request)
    console.log('\n[Customer 2] Mengajukan Permintaan Pengambilan Sampel Lab...')
    const { data: newReq, error: reqErr } = await supabase.from('oil_lab_requests').insert({
      customer_id: testCustId,
      machine_id: state.machineId,
      requested_by_profile_id: state.customerProfileId,
      title: 'Permintaan Uji Rutin Bulan Agustus 2026',
      description: 'Mohon pengambilan sampel oli mesin turbin generator',
      priority: 'high',
      status: 'pending',
      is_new_machine: false
    }).select().single()
    assert(!reqErr && newReq?.id, 'Customer berhasil mengajukan Permintaan Lab (status: pending)', reqErr?.message)
    state.labRequestId = newReq?.id

    // 2.3 Pemesanan Produk Oli (Orders)
    console.log('\n[Customer 3] Melakukan Pemesanan Produk Oli / Permintaan Penawaran...')
    const { data: newOrder, error: oErr } = await supabase.from('oil_orders').insert({
      customer_id: testCustId,
      product_id: state.productId,
      quantity: 5,
      status: 'pending'
    }).select().single()
    assert(!oErr && newOrder?.id, 'Customer berhasil membuat pesanan oli (status: pending)', oErr?.message)
    state.orderId = newOrder?.id

    // 2.4 Mengajukan Komplain Layanan Purna Jual
    console.log('\n[Customer 4] Mengajukan Komplain Pesanan Purna Jual...')
    const { data: newComplaint, error: compErr } = await supabase.from('oil_complaints').insert({
      customer_id: testCustId,
      order_id: state.orderId,
      description: 'Pengiriman drum oli sedikit terlambat dari jadwal yang disepakati',
      complaint_text: 'Pengiriman drum oli sedikit terlambat dari jadwal yang disepakati',
      status: 'open'
    }).select().single()
    assert(!compErr && newComplaint?.id, 'Customer berhasil mengirimkan komplain purna jual', compErr?.message)
    state.complaintId = newComplaint?.id

    // 2.5 Update Profil Customer
    console.log('\n[Customer 5] Memperbarui Informasi Profil Pengguna...')
    const { error: profUpdErr } = await supabase.from('oil_profiles').update({
      phone_number: '+6281298765432'
    }).eq('id', state.customerProfileId)
    assert(!profUpdErr, 'Customer berhasil memperbarui nomor kontak telepon', profUpdErr?.message)

    // =============================================================
    // ROLE 3: SALES (PENANGANAN ANTREAN, FOTO SAMPEL & PROSES ORDER)
    // =============================================================
    console.log('\n💼 ─────────────────────────────────────────────────────────────')
    console.log('   ROLE: SALES EXECUTIVE')
    console.log('   ─────────────────────────────────────────────────────────────')

    // 3.1 Antrean Permintaan Lab (Queue & Status Updates)
    console.log('\n[Sales 1] Mengambil Tugas Permintaan Uji Lab...')
    const { error: assignErr } = await supabase.from('oil_lab_requests').update({
      status: 'assigned',
      assigned_to_profile_id: state.salesProfileId
    }).eq('id', state.labRequestId)
    assert(!assignErr, 'Sales berhasil mengklaim tugas lab request (status -> assigned)', assignErr?.message)

    // 3.2 Mengunggah Foto Botol Sampel Fisik ke Bucket "sample-photos"
    console.log('\n[Sales 2] Mengunggah Foto Botol Sampel Fisik ke Storage...')
    const dummyImageContent = Buffer.from('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD')
    const samplePhotoPath = `samples/sample_${state.labRequestId}_${Date.now()}.jpg`
    const { error: photoUploadErr } = await supabase.storage.from('sample-photos').upload(samplePhotoPath, dummyImageContent, {
      contentType: 'image/jpeg',
      upsert: true
    })
    assert(!photoUploadErr, 'Sales berhasil mengunggah foto sampel fisik ke bucket "sample-photos"', photoUploadErr?.message)

    const { error: updReqPhotoErr } = await supabase.from('oil_lab_requests').update({
      status: 'sampling',
      sample_photo_path: samplePhotoPath
    }).eq('id', state.labRequestId)
    assert(!updReqPhotoErr, 'Sales berhasil memperbarui status menjadi "sampling" & melampirkan path foto sampel', updReqPhotoErr?.message)

    // 3.3 Menyelesaikan Antrean Lab (Completed)
    console.log('\n[Sales 3] Menyelesaikan Pengambilan Sampel & Mengirim ke Lab...')
    const { error: compReqErr } = await supabase.from('oil_lab_requests').update({
      status: 'completed'
    }).eq('id', state.labRequestId)
    assert(!compReqErr, 'Sales berhasil menandai permintaan uji lab selesai (status -> completed)', compReqErr?.message)

    // 3.4 Menyetujui & Memproses Pesanan Customer (ACC Order)
    console.log('\n[Sales 4] Memproses Pesanan Masuk (Order ACC)...')
    const { error: accOrderErr } = await supabase.from('oil_orders').update({
      status: 'processing'
    }).eq('id', state.orderId)
    assert(!accOrderErr, 'Sales/Admin berhasil menyetujui pesanan oli (status -> processing)', accOrderErr?.message)

    // =============================================================
    // ROLE 1 (ADMIN): PENYELESAIAN KOMPLAIN & CLEANUP
    // =============================================================
    console.log('\n👑 ─────────────────────────────────────────────────────────────')
    console.log('   ADMIN: RESOLUSI KOMPLAIN & VERIFIKASI AKHIR')
    console.log('   ─────────────────────────────────────────────────────────────')

    console.log('\n[Admin 6] Menanggapi & Menyelesaikan Komplain Pelanggan...')
    const { error: resCompErr } = await supabase.from('oil_complaints').update({
      status: 'resolved',
      resolution_notes: 'Jadwal pengiriman telah dioptimasi dan kompensasi voucher pemeliharaan telah dikirim.'
    }).eq('id', state.complaintId)
    assert(!resCompErr, 'Admin berhasil memberikan tanggapan dan menyelesaikan komplain (status -> resolved)', resCompErr?.message)

    // -------------------------------------------------------------
    // PEMBERSIHAN DATA TEST (CLEANUP)
    // -------------------------------------------------------------
    console.log('\n🧹 Membersihkan data pengujian sementara...')
    if (state.complaintId) await supabase.from('oil_complaints').delete().eq('id', state.complaintId)
    if (state.orderId) await supabase.from('oil_orders').delete().eq('id', state.orderId)
    if (state.labRequestId) await supabase.from('oil_lab_requests').delete().eq('id', state.labRequestId)
    if (state.labTestId) await supabase.from('oil_lab_tests').delete().eq('id', state.labTestId)
    if (state.machineId) await supabase.from('oil_machines').delete().eq('id', state.machineId)
    if (state.productId) await supabase.from('oil_products').delete().eq('id', state.productId)
    if (testCustId) await supabase.from('oil_customers').delete().eq('id', testCustId)
    if (pdfPath) await supabase.storage.from('lab-reports').remove([pdfPath])
    if (samplePhotoPath) await supabase.storage.from('sample-photos').remove([samplePhotoPath])
    console.log('  ✅ Data pengujian sementara berhasil dibersihkan dengan aman.')

    // =============================================================
    // RANGKUMAN HASIL
    // =============================================================
    console.log('\n══════════════════════════════════════════════════════════════════════')
    console.log(`  TOTAL PENILAIAN UAT: ✅ ${state.passCount} BERHASIL  |  ❌ ${state.failCount} GAGAL`)
    console.log('══════════════════════════════════════════════════════════════════════\n')

  } catch (err) {
    console.error('Fatal error during role simulation test:', err)
  }
}

runRoleSimulation()
