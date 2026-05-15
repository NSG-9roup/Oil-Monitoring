import { IMachineRepository } from '@/lib/domain/repositories/IMachineRepository'
import { ICustomerRepository } from '@/lib/domain/repositories/ICustomerRepository'
import { IMaintenanceRepository } from '@/lib/domain/repositories/IMaintenanceRepository'
import { ILabTestRepository } from '@/lib/domain/repositories/ILabTestRepository'
import { IAuthService } from '@/lib/domain/services/IAuthService'
import { createClient } from '@/lib/supabase/server'

export class GetDashboardData {
  constructor(
    private customerRepo: ICustomerRepository,
    private machineRepo: IMachineRepository,
    private maintenanceRepo: IMaintenanceRepository,
    private labTestRepo: ILabTestRepository,
    private authService: IAuthService
  ) {}

  async execute(userId: string) {
    const profile = await this.authService.getUserProfile(userId)
    if (!profile || !profile.customer_id) {
      throw new Error('Customer access required')
    }

    const customerId = profile.customer_id
    const supabase = await createClient()

    // Parallel fetching for performance
    const [
      customer,
      machines,
      allLabTests,
      teamMembers,
      maintenanceActions,
      maintenanceActionLogs
    ] = await Promise.all([
      this.customerRepo.findById(customerId),
      this.machineRepo.findByCustomerId(customerId),
      this.labTestRepo.findAll(),
      supabase
        .from('oil_profiles')
        .select('id, full_name, email, phone_number, created_at')
        .eq('customer_id', customerId)
        .eq('role', 'customer')
        .order('created_at', { ascending: false }),
      supabase
        .from('oil_maintenance_actions')
        .select('*, machine:oil_machines(machine_name, location), owner:oil_profiles!oil_maintenance_actions_owner_profile_id_fkey(full_name, email)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false }),
      supabase
        .from('oil_maintenance_action_logs')
        .select('id, action_id, actor_id, event_type, from_status, to_status, metadata, created_at')
        .order('created_at', { ascending: false })
    ])

    const machineIds = machines.map(m => m.id)
    const filteredLabTests = allLabTests.filter(t => machineIds.includes(t.machine_id))

    return {
      profile,
      customer,
      machines,
      labTests: filteredLabTests,
      teamMembers: teamMembers.data || [],
      maintenanceActions: maintenanceActions.data || [],
      maintenanceActionLogs: maintenanceActionLogs.data || []
    }
  }
}
