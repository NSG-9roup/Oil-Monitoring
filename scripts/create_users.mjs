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

async function createAccounts() {
  console.log('Creating accounts...')
  
  // 1. Create a dummy customer company first
  const { data: customer, error: customerErr } = await supabase
    .from('oil_customers')
    .insert([{ company_name: 'PT Dummy Customer', status: 'active' }])
    .select()
    .single()

  if (customerErr) {
    console.error('Error creating customer:', customerErr.message)
    return
  }
  
  console.log('Created Customer Company:', customer.company_name)

  const usersToCreate = [
    { email: 'admin@oil.com', password: 'password123', role: 'admin', full_name: 'Admin User', customer_id: null },
    { email: 'sales@oil.com', password: 'password123', role: 'sales', full_name: 'Sales User', customer_id: null },
    { email: 'customer@oil.com', password: 'password123', role: 'customer', full_name: 'Customer User', customer_id: customer.id }
  ]

  for (const u of usersToCreate) {
    const { data: { users }, error: checkErr } = await supabase.auth.admin.listUsers()
    const existing = users.find(user => user.email === u.email)
    
    let userId
    if (existing) {
      console.log(`User ${u.email} already exists.`)
      userId = existing.id
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true
      })
      
      if (error) {
        console.error(`Error creating ${u.email}:`, error.message)
        continue
      }
      userId = data.user.id
      console.log(`Created Auth User: ${u.email}`)
    }

    const { error: profileErr } = await supabase
      .from('oil_profiles')
      .upsert({
        id: userId,
        role: u.role,
        full_name: u.full_name,
        email: u.email,
        customer_id: u.customer_id
      })
      
    if (profileErr) {
      console.error(`Error creating profile for ${u.email}:`, profileErr.message)
    } else {
      console.log(`Created Profile for: ${u.email} (Role: ${u.role})`)
    }
  }
  
  console.log('Done!')
}

createAccounts()
