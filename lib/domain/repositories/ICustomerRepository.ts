import { Customer } from '../entities/customer'

export interface ICustomerRepository {
  findAll(): Promise<Customer[]>
  findById(id: string): Promise<Customer | null>
  delete(id: string): Promise<void>
  // Add other methods as needed
}
