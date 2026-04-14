import { createClient } from '@/lib/supabase/client'
import { SupabaseClient } from '@supabase/supabase-js'

export const customerService = {
  getCustomers: async (supabaseClient?: SupabaseClient) => {
    const supabase = supabaseClient || createClient()
    return supabase
      .from('oil_customers')
      .select('*')
      .order('company_name')
  },
  
  deleteCustomer: async (id: string, supabaseClient?: SupabaseClient) => {
    const supabase = supabaseClient || createClient()
    return supabase
      .from('oil_customers')
      .delete()
      .eq('id', id)
  }
}
