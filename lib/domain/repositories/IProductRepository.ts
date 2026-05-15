import { Product, AdminProduct } from '../entities/product'

export interface IProductRepository {
  findAll(): Promise<AdminProduct[]>
  findById(id: string): Promise<Product | null>
  create(data: Partial<Product>): Promise<Product>
  update(id: string, data: Partial<Product>): Promise<void>
  delete(id: string): Promise<void>
}
