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

async function setupBuckets() {
  console.log('Setting up storage buckets...')

  // 1. Create customer-logos
  const { data: logosData, error: logosError } = await supabase.storage.createBucket('customer-logos', {
    public: true,
    fileSizeLimit: 2 * 1024 * 1024, // 2MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  })
  if (logosError) {
    if (logosError.message.includes('already exists')) {
      console.log('✅ Bucket "customer-logos" already exists.')
    } else {
      console.error('❌ Error creating "customer-logos":', logosError)
    }
  } else {
    console.log('✅ Created bucket "customer-logos".')
  }

  // 2. Create lab-reports
  const { data: labData, error: labError } = await supabase.storage.createBucket('lab-reports', {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['application/pdf']
  })
  if (labError) {
    if (labError.message.includes('already exists')) {
      console.log('✅ Bucket "lab-reports" already exists.')
    } else {
      console.error('❌ Error creating "lab-reports":', labError)
    }
  } else {
    console.log('✅ Created bucket "lab-reports".')
  }
}

setupBuckets()
