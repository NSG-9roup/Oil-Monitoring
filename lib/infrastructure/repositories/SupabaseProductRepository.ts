import { createClient } from '@/lib/supabase/client'
import { IProductRepository } from '@/lib/domain/repositories/IProductRepository'
import { Product, AdminProduct } from '@/lib/domain/entities/product'

export class SupabaseProductRepository implements IProductRepository {
  async findAll(): Promise<AdminProduct[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('oil_products')
      .select('*')
      .order('product_name')
    
    if (error) throw error
    return data || []
  }

  async findById(id: string): Promise<Product | null> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('oil_products')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) return null
    return data
  }

  async create(data: Partial<Product>): Promise<Product> {
    const supabase = createClient()
    const { data: created, error } = await supabase
      .from('oil_products')
      .insert([data])
      .select()
      .single()
    
    if (error) throw error
    return created
  }

  async update(id: string, data: Partial<Product>): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('oil_products')
      .update(data)
      .eq('id', id)
    
    if (error) throw error
  }

  async delete(id: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('oil_products')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}
