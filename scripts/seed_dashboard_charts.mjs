import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seedDataForDashboardCharts() {
  console.log('=== 1. POPULATING BASELINE SPECIFICATIONS FOR OIL PRODUCTS ===')
  const { data: products } = await supabase.from('oil_products').select('*')
  
  const gradeMap = {
    '32': { v40: 32.0, v100: 5.4, tan: 0.5 },
    '46': { v40: 46.0, v100: 6.8, tan: 0.5 },
    '68': { v40: 68.0, v100: 8.7, tan: 0.6 },
    '100': { v40: 100.0, v100: 11.2, tan: 0.7 },
    '150': { v40: 150.0, v100: 15.0, tan: 0.8 },
    '220': { v40: 220.0, v100: 19.4, tan: 0.9 },
    '320': { v40: 320.0, v100: 24.5, tan: 1.0 },
    '460': { v40: 460.0, v100: 31.0, tan: 1.1 }
  }

  for (const prod of products || []) {
    let matched = null
    for (const [grade, vals] of Object.entries(gradeMap)) {
      if (
        (prod.viscosity_grade && prod.viscosity_grade.includes(grade)) ||
        (prod.product_name && prod.product_name.includes(grade))
      ) {
        matched = vals
        break
      }
    }

    if (matched) {
      await supabase
        .from('oil_products')
        .update({
          baseline_viscosity_40c: matched.v40,
          baseline_viscosity_100c: matched.v100,
          baseline_tan: matched.tan,
          oil_grade: prod.viscosity_grade || 'ISO VG ' + matched.v40
        })
        .eq('id', prod.id)
    }
  }
  console.log('✅ Baseline values updated for oil products.')

  console.log('\n=== 2. SEEDING REALISTIC LAB TEST SAMPLES FOR PT GAJAH TUNGGAL ===')
  // Find PT Gajah Tunggal
  const { data: customer } = await supabase
    .from('oil_customers')
    .select('id, company_name')
    .ilike('company_name', '%gajah tunggal%')
    .single()

  if (!customer) {
    console.error('PT Gajah Tunggal not found')
    return
  }

  // Find machine for PT Gajah Tunggal
  let { data: machine } = await supabase
    .from('oil_machines')
    .select('id, machine_name')
    .eq('customer_id', customer.id)
    .limit(1)
    .single()

  if (!machine) {
    const { data: newMach } = await supabase
      .from('oil_machines')
      .insert({
        customer_id: customer.id,
        machine_name: 'ATLAS COPCO GA 200',
        model: 'GA-200-VSD',
        serial_number: 'AC-2024-998',
        location: 'Compressor House Area B',
        status: 'active'
      })
      .select()
      .single()
    machine = newMach
  }

  // Pick suitable product (e.g. Azolla ZS 46 or Equivis ZS 46)
  const { data: product } = await supabase
    .from('oil_products')
    .select('*')
    .ilike('product_name', '%46%')
    .limit(1)
    .single()

  console.log(`Using Machine: ${machine.machine_name} (${machine.id})`)
  console.log(`Using Product: ${product.product_name} (${product.id})`)

  // Check if test samples already exist
  const { count } = await supabase
    .from('oil_lab_tests')
    .select('*', { count: 'exact', head: true })
    .eq('machine_id', machine.id)

  if (count === 0) {
    const testSamples = [
      {
        machine_id: machine.id,
        product_id: product.id,
        test_date: '2026-03-15',
        viscosity_40c: 46.2,
        viscosity_100c: 6.82,
        water_content: 45,
        water_content_unit: 'PPM',
        tan_value: 0.52,
        notes: 'Oli dalam kondisi baru (fresh oil), baseline stabil dan sangat bersih.',
        created_at: new Date('2026-03-15T09:00:00Z').toISOString()
      },
      {
        machine_id: machine.id,
        product_id: product.id,
        test_date: '2026-04-18',
        viscosity_40c: 46.5,
        viscosity_100c: 6.85,
        water_content: 52,
        water_content_unit: 'PPM',
        tan_value: 0.54,
        notes: 'Monitoring 500 jam operasional. Viskositas sangat baik, filter berfungsi optimal.',
        created_at: new Date('2026-04-18T10:15:00Z').toISOString()
      },
      {
        machine_id: machine.id,
        product_id: product.id,
        test_date: '2026-05-22',
        viscosity_40c: 47.1,
        viscosity_100c: 6.88,
        water_content: 68,
        water_content_unit: 'PPM',
        tan_value: 0.58,
        notes: 'Monitoring 1000 jam operasional. Kondisi pelumas normal dan aman.',
        created_at: new Date('2026-05-22T11:30:00Z').toISOString()
      },
      {
        machine_id: machine.id,
        product_id: product.id,
        test_date: '2026-06-25',
        viscosity_40c: 47.8,
        viscosity_100c: 6.92,
        water_content: 85,
        water_content_unit: 'PPM',
        tan_value: 0.62,
        notes: 'Monitoring 1500 jam operasional. Sedikit peningkatan TAN akibat suhu kerja, dalam batas wajar.',
        created_at: new Date('2026-06-25T14:20:00Z').toISOString()
      },
      {
        machine_id: machine.id,
        product_id: product.id,
        test_date: '2026-07-28',
        viscosity_40c: 48.4,
        viscosity_100c: 6.95,
        water_content: 95,
        water_content_unit: 'PPM',
        tan_value: 0.66,
        notes: 'Monitoring 2000 jam operasional. Rekomendasi: teruskan pemakaian hingga jadwal servis 2500 jam.',
        created_at: new Date('2026-07-28T08:45:00Z').toISOString()
      }
    ]

    const { error: insErr } = await supabase.from('oil_lab_tests').insert(testSamples)
    if (insErr) {
      console.error('Error inserting lab tests:', insErr)
    } else {
      console.log(`✅ Successfully seeded 5 realistic lab test records for ${customer.company_name}!`)
    }
  } else {
    console.log(`Machine already has ${count} lab test records.`)
  }
}

seedDataForDashboardCharts().catch(console.error)
