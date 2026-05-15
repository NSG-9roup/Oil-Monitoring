export interface Product {
  id: string
  product_name: string
  product_type: string
  base_oil?: string
  viscosity_grade?: string
  oil_grade?: string
  created_at: string
  updated_at: string
}

export interface AdminProduct extends Product {
  baseline_viscosity_40c?: number | null
  baseline_viscosity_100c?: number | null
  baseline_tan?: number | null
}

export interface ProductFormData {
  product_name: string
  product_type: string
  base_oil?: string
  viscosity_grade?: string
  baseline_viscosity_40c?: number
  baseline_viscosity_100c?: number
  baseline_tan?: number
  oil_grade?: string
}
