import { Machine, AdminMachine } from '../entities/machine'

export interface IMachineRepository {
  findAll(): Promise<AdminMachine[]>
  findByCustomerId(customerId: string): Promise<Machine[]>
  findById(id: string): Promise<Machine | null>
  create(data: Partial<Machine>): Promise<Machine>
  update(id: string, data: Partial<Machine>): Promise<void>
}
