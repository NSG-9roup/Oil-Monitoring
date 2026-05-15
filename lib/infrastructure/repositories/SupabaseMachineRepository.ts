import { createClient } from '@/lib/supabase/client'
import { IMachineRepository } from '@/lib/domain/repositories/IMachineRepository'
import { Machine, AdminMachine } from '@/lib/domain/entities/machine'

export class SupabaseMachineRepository implements IMachineRepository {
  async findAll(): Promise<AdminMachine[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('oil_machines')
      .select('*, customer:oil_customers(company_name)')
    
    if (error) throw error
    return data || []
  }

  async findByCustomerId(customerId: string): Promise<Machine[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('oil_machines')
      .select('*')
      .eq('customer_id', customerId)
    
    if (error) throw error
    return data || []
  }

  async findById(id: string): Promise<Machine | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('oil_machines')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) return null
    return data
  }

  async create(data: Partial<Machine>): Promise<Machine> {
    const supabase = createClient()
    const { data: created, error } = await supabase
      .from('oil_machines')
      .insert([data])
      .select()
      .single()
    
    if (error) throw error
    return created
  }

  async update(id: string, data: Partial<Machine>): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('oil_machines')
      .update(data)
      .eq('id', id)
    
    if (error) throw error
  }
}
