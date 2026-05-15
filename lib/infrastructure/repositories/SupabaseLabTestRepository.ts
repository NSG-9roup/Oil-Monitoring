import { createClient } from '@/lib/supabase/client'
import { ILabTestRepository } from '@/lib/domain/repositories/ILabTestRepository'
import { LabTest, AdminLabTest } from '@/lib/domain/entities/lab-test'

export class SupabaseLabTestRepository implements ILabTestRepository {
  private async getServiceClient() {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  }

  async findAll(): Promise<AdminLabTest[]> {
    const supabase = createClient()
    const query = '*, machine:oil_machines(machine_name, customer_id, customer:oil_customers(company_name)), product:product_id(product_name, product_type, baseline_viscosity_40c, baseline_viscosity_100c, baseline_tan)'
    
    const { data, error } = await supabase
      .from('oil_lab_tests')
      .select(query)
      .order('test_date', { ascending: false })
    
    // Fallback to service role if no data found (common with RLS issues in this project)
    if ((!data || data.length === 0) && !error) {
      const supabaseService = await this.getServiceClient()
      const result = await supabaseService
        .from('oil_lab_tests')
        .select(query)
        .order('test_date', { ascending: false })
      data = result.data
    }

    if (error) throw error
    return data || []
  }

  async findByMachineId(machineId: string): Promise<LabTest[]> {
    const supabase = createClient()
    const query = '*, product:product_id(product_name, product_type, baseline_viscosity_40c, baseline_viscosity_100c, baseline_tan)'
    
    const { data, error } = await supabase
      .from('oil_lab_tests')
      .select(query)
      .eq('machine_id', machineId)
      .order('test_date', { ascending: false })

    if ((!data || data.length === 0) && !error) {
      const supabaseService = await this.getServiceClient()
      const result = await supabaseService
        .from('oil_lab_tests')
        .select(query)
        .eq('machine_id', machineId)
        .order('test_date', { ascending: false })
      data = result.data
    }
    
    if (error) throw error
    return data || []
  }

  async create(data: Partial<LabTest>): Promise<LabTest> {
    const supabase = createClient()
    const { data: created, error } = await supabase
      .from('oil_lab_tests')
      .insert([data])
      .select()
      .single()
    
    if (error) throw error
    return created
  }

  async update(id: string, data: Partial<LabTest>): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('oil_lab_tests')
      .update(data)
      .eq('id', id)
    
    if (error) throw error
  }

  async delete(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('oil_lab_tests')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}
