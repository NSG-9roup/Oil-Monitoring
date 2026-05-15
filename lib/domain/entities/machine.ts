import { Product } from './product'

export interface Machine {
  id: string
  customer_id: string
  machine_name: string
  serial_number?: string
  model?: string
  location: string | null
  status: string
  created_at: string
  updated_at: string
}

export interface AdminMachine extends Machine {
  customer?: { company_name: string } | null
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

export interface MachineFormData {
  machine_name: string
  customer_id: string
  serial_number?: string
  model?: string
  location?: string
  status: string
}
