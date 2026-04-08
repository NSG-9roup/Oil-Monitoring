export interface Customer {
  id: string
  company_name: string
  status: string
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  role: 'customer' | 'admin' | 'sales'
  customer_id: string | null
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  product_name: string
  product_type: string
  created_at: string
  updated_at: string
}

export interface Machine {
  id: string
  customer_id: string
  machine_name: string
  location: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface MachineProduct {
  id: string
  machine_id: string
  product_id: string
  start_date: string
  end_date: string | null
  created_at: string
  updated_at: string
  product?: Product
}

export interface LabTest {
  id: string
  machine_id: string
  product_id: string
  test_date: string
  viscosity: number | null
  water_content: number | null
  tan_value: number | null
  pdf_path: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
}

export interface PurchaseHistory {
  id: string
  customer_id: string
  product_id: string
  quantity: number
  purchase_date: string
  unit_price: number
  total_price: number
  status: 'completed' | 'pending' | 'cancelled'
  created_at: string
  updated_at: string
  product?: Product
}
