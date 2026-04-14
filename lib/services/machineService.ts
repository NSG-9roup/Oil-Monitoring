import { createClient } from '@/lib/supabase/client'
import { SupabaseClient } from '@supabase/supabase-js'

export const machineService = {
  getMachines: async (supabaseClient?: SupabaseClient) => {
    const supabase = supabaseClient || createClient()
    return supabase
      .from('oil_machines')
      .select('*, customer:oil_customers(company_name)')
      .order('machine_name')
  },

  getActiveMachines: async (supabaseClient?: SupabaseClient) => {
    const supabase = supabaseClient || createClient()
    return supabase
      .from('oil_machines')
      .select('id, machine_name, customer_id, customer:oil_customers(company_name)')
      .eq('status', 'active')
  }
}
