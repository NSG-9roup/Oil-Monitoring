import { MaintenanceAction } from '../entities/maintenance'

export interface IMaintenanceRepository {
  create(data: Partial<MaintenanceAction>): Promise<void>
  update(id: string, data: Partial<MaintenanceAction>): Promise<void>
  findById(id: string): Promise<MaintenanceAction | null>
  // Add other methods as needed
}
