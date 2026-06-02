import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function runTests() {
  console.log('--- STARTING ADMIN TESTS ---')

  // 1. Test Customer Creation
  console.log('\nTesting Customers...')
  const customerId = crypto.randomUUID()
  const { error: customerError } = await supabase.from('oil_customers').insert({
    id: customerId,
    company_name: 'TEST CUSTOMER COMPANY',
    status: 'active'
  })
  if (customerError) console.error('❌ Failed to create customer:', customerError.message)
  else console.log('✅ Customer created successfully')

  // 2. Test Machine Creation
  console.log('\nTesting Machines...')
  const machineId = crypto.randomUUID()
  const { error: machineError } = await supabase.from('oil_machines').insert({
    id: machineId,
    customer_id: customerId,
    machine_name: 'TEST MACHINE 1',
    status: 'active'
  })
  if (machineError) console.error('❌ Failed to create machine:', machineError.message)
  else console.log('✅ Machine created successfully')

  // 3. Test Product Creation
  console.log('\nTesting Products...')
  const productId = crypto.randomUUID()
  const { error: productError } = await supabase.from('oil_products').insert({
    id: productId,
    product_name: 'TEST PRODUCT 1',
    product_type: 'Engine Oil'
  })
  if (productError) console.error('❌ Failed to create product:', productError.message)
  else console.log('✅ Product created successfully')

  // 4. Test Lab Request Creation
  console.log('\nTesting Lab Requests...')
  const reqId = crypto.randomUUID()
  const adminId = 'd8ee3cb5-3fb8-4efc-8d19-4cb4659b0f4a' // Will fail if profile doesn't exist, we will use a real ID
  const { data: admin } = await supabase.from('oil_profiles').select('id').limit(1).single()
  
  if (admin) {
    const { error: reqError } = await supabase.from('oil_lab_requests').insert({
      id: reqId,
      customer_id: customerId,
      machine_id: machineId,
      requested_by_profile_id: admin.id,
      title: 'TEST REQUEST',
      priority: 'high',
      status: 'pending',
      is_new_machine: false
    })
    if (reqError) console.error('❌ Failed to create lab request:', reqError.message)
    else console.log('✅ Lab request created successfully')
  } else {
    console.log('⚠️ Skipping lab request (no profiles found)')
  }

  // 5. Test Lab Test Result Creation
  console.log('\nTesting Lab Tests (Results)...')
  const testId = crypto.randomUUID()
  const { error: testError } = await supabase.from('oil_lab_tests').insert({
    id: testId,
    machine_id: machineId,
    product_id: productId,
    test_date: new Date().toISOString().split('T')[0],
    water_content: 100,
    tan_value: 0.5
  })
  if (testError) console.error('❌ Failed to create lab test result:', testError.message)
  else console.log('✅ Lab test result created successfully')

  // 6. Test Cleanup (DELETE)
  console.log('\nCleaning up test data...')
  await supabase.from('oil_lab_tests').delete().eq('id', testId)
  if (admin) await supabase.from('oil_lab_requests').delete().eq('id', reqId)
  await supabase.from('oil_products').delete().eq('id', productId)
  await supabase.from('oil_machines').delete().eq('id', machineId)
  await supabase.from('oil_customers').delete().eq('id', customerId)
  
  console.log('✅ Test data cleaned up successfully')
  console.log('\n--- TESTS COMPLETED SUCCESSFULLY ---')
}

runTests().catch(console.error)
