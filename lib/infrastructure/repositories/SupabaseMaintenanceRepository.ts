import { createClient } from '@/lib/supabase/server'
import { IMaintenanceRepository } from '@/lib/domain/repositories/IMaintenanceRepository'
import { MaintenanceAction } from '@/lib/domain/entities/maintenance'

export class SupabaseMaintenanceRepository implements IMaintenanceRepository {
  async create(data: Partial<MaintenanceAction>): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase.from('oil_maintenance_actions').insert([data])
    if (error) throw error
  }

  async update(id: string, data: Partial<MaintenanceAction>): Promise<void> {
    const supabase = await createClient()
    const { error } = await supabase.from('oil_maintenance_actions').update(data).eq('id', id)
    if (error) throw error
  }

  async findById(id: string): Promise<MaintenanceAction | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('oil_maintenance_actions')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) return null
    return data
  }
}
