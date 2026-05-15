import { LabTest, AdminLabTest } from '../entities/lab-test'

export interface ILabTestRepository {
  findAll(): Promise<AdminLabTest[]>
  findByMachineId(machineId: string): Promise<LabTest[]>
  create(data: Partial<LabTest>): Promise<LabTest>
  update(id: string, data: Partial<LabTest>): Promise<void>
  delete(id: string): Promise<void>
}
