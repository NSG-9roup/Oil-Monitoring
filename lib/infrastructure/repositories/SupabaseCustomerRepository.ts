import { createClient } from '@/lib/supabase/client'
import { ICustomerRepository } from '@/lib/domain/repositories/ICustomerRepository'
import { Customer } from '@/lib/domain/entities/customer'

export class SupabaseCustomerRepository implements ICustomerRepository {
  async findAll(): Promise<Customer[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('oil_customers')
      .select('*')
      .order('company_name')
    
    if (error) throw error
    return data || []
  }

  async findById(id: string): Promise<Customer | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('oil_customers')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) return null
    return data
  }

  async delete(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('oil_customers')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}
