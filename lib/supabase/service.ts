import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client with the service role key to bypass RLS.
 * This should only be used in Server Actions, Route Handlers, or Server Components
 * for privileged operations, and NEVER exposed on the client.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
